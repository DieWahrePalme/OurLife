/* eslint-disable react-hooks/immutability -- Reanimated values are written with `.value =` in gestures and effects; they are not React state. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, type LayoutChangeEvent, type View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Point, Rect } from './layout';
import type { TwoFingerTarget } from './use-two-finger';

/** How far the page may be zoomed in, as a multiple of "fits the screen". */
const MAX_ZOOM = 8;
/** Largest "fits the screen" scale (a big desktop window still gets a bigger page). */
const MAX_FIT = 3;
/** Page pixels that must stay in view when the page is dragged away, so it can never get lost. */
const KEEP_IN_VIEW = 60;
const DOUBLE_TAP_ZOOM = 3;
const BUTTON_ZOOM_STEP = 1.6;
const ANIMATION_MS = 220;
/** After a zoom has settled, the page is drawn again at its real size when it differs by more than this. */
const REDRAW_RATIO = 0.12;
const WHEEL_SETTLE_MS = 180;
/** A swipe must travel this far (px) and be mostly sideways to turn the page. */
const SWIPE_DISTANCE = 64;
const SWIPE_STRAIGHTNESS = 2;
/** Zoomed in by more than this share of "whole page" counts as zoomed. */
const ZOOMED_THRESHOLD = 1.05;
const WHEEL_SPEED = 0.0018;

export interface ViewSize {
  width: number;
  height: number;
}

/** A point of the page, in page pixels. */
export interface PagePoint {
  x: number;
  y: number;
}

interface CanvasViewOptions {
  pageWidth: number;
  pageHeight: number;
  /** Free space around the page when it fits the screen. */
  padding: number;
  /** Height at the bottom of the area kept free (status line). */
  bottomRoom: number;
  onBackgroundTap: () => void;
  /** A finger started dragging on the page, at this point of the page (not on an item): may be a locked item. */
  onBackgroundDrag: (pageX: number, pageY: number) => void;
  /** Where two-finger pinch and turn go while an item is selected. */
  target: TwoFingerTarget;
  /** A quick sideways swipe on the background while the whole page is shown: 1 = to the next page, -1 = to the one before. */
  onSwipe: (direction: 1 | -1) => void;
}

/** Keeps a position inside the allowed range (worklet, also used on the JS thread). */
function clampAxis(position: number, viewport: number, content: number): number {
  'worklet';
  if (content <= viewport) return (viewport - content) / 2;
  return Math.min(KEEP_IN_VIEW, Math.max(viewport - content - KEEP_IN_VIEW, position));
}

/**
 * Zoom and pan of the day page, like in a drawing program: pinch or wheel to zoom around the fingers, drag the
 * background to move, double tap to jump in and out. The page keeps its logical size; only the view moves.
 *
 * While a zoom is going on the page is stretched (smooth). Once it settles the page is laid out again at the new
 * size (`renderScale`), so text and pictures are sharp at any zoom instead of blurry.
 */
export function useCanvasView({ pageWidth, pageHeight, padding, bottomRoom, onBackgroundTap, onBackgroundDrag, target, onSwipe }: CanvasViewOptions) {
  const [viewport, setViewport] = useState<ViewSize>({ width: 0, height: 0 });
  const viewportRef = useRef<View>(null);
  const fit =
    viewport.width > 0
      ? Math.max(
          Math.min(
            MAX_FIT,
            (viewport.width - padding * 2) / pageWidth,
            (viewport.height - padding * 2 - bottomRoom) / pageHeight,
          ),
          0,
        )
      : 0;

  /** Scale the page is laid out at. Follows `fit` by itself when the screen size changes. */
  const [drawn, setDrawn] = useState<{ fit: number; scale: number }>({
    fit: 0,
    scale: 0,
  });
  const renderScale = drawn.fit === fit && drawn.scale > 0 ? drawn.scale : fit;

  /** Live scale (screen pixels per page pixel) and the position of the page's top-left corner on screen. */
  const scale = useSharedValue(fit);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sizeW = useSharedValue(0);
  const sizeH = useSharedValue(0);
  const fitShared = useSharedValue(fit);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const pinching = useSharedValue(false);

  // A new screen size (or the first measure) shows the whole page, centred.
  useEffect(() => {
    scale.value = fit;
    fitShared.value = fit;
    sizeW.value = viewport.width;
    sizeH.value = viewport.height;
    tx.value = clampAxis(0, viewport.width, pageWidth * fit);
    ty.value = clampAxis(0, viewport.height - bottomRoom, pageHeight * fit);
  }, [fit, viewport, pageWidth, pageHeight, bottomRoom, scale, fitShared, sizeW, sizeH, tx, ty]);

  const settle = useCallback(() => {
    const live = scale.value;
    if (live <= 0 || fit <= 0) return;
    if (Math.abs(live / renderScale - 1) > REDRAW_RATIO) setDrawn({ fit, scale: live });
  }, [scale, fit, renderScale]);

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
  }, []);

  /** Moves the view smoothly so that `focus` (a point on screen) stays where it is while the scale becomes `target`. */
  const zoomTo = useCallback(
    (target: number, focusX: number, focusY: number) => {
      const next = Math.min(fit * MAX_ZOOM, Math.max(fit, target));
      const k = next / scale.value;
      const nextTx = clampAxis(focusX - (focusX - tx.value) * k, viewport.width, pageWidth * next);
      const nextTy = clampAxis(focusY - (focusY - ty.value) * k, viewport.height - bottomRoom, pageHeight * next);
      scale.value = withTiming(next, { duration: ANIMATION_MS });
      tx.value = withTiming(nextTx, { duration: ANIMATION_MS });
      ty.value = withTiming(nextTy, { duration: ANIMATION_MS });
      setTimeout(settle, ANIMATION_MS + 40);
    },
    [fit, scale, tx, ty, viewport, pageWidth, pageHeight, bottomRoom, settle],
  );

  const middle = useCallback(() => ({ x: viewport.width / 2, y: (viewport.height - bottomRoom) / 2 }), [viewport, bottomRoom]);
  const zoomIn = useCallback(() => zoomTo(scale.value * BUTTON_ZOOM_STEP, middle().x, middle().y), [zoomTo, scale, middle]);
  const zoomOut = useCallback(() => zoomTo(scale.value / BUTTON_ZOOM_STEP, middle().x, middle().y), [zoomTo, scale, middle]);
  const zoomFit = useCallback(() => zoomTo(fit, middle().x, middle().y), [zoomTo, fit, middle]);
  const zoomToggle = useCallback(
    (focusX: number, focusY: number) => zoomTo(scale.value > fit * 1.3 ? fit : fit * DOUBLE_TAP_ZOOM, focusX, focusY),
    [zoomTo, scale, fit],
  );

  /** True while two fingers work on the selected item instead of the page. */
  const forItem = useSharedValue(false);
  const pinchDown = useSharedValue(false);
  const turnDown = useSharedValue(false);

  const gesture = useMemo(() => {
    /** The first of pinch / turn to start decides: an item is selected, so the fingers belong to it. */
    const beginTwoFingers = () => {
      'worklet';
      if (pinchDown.value || turnDown.value) return;
      pinching.value = true;
      startScale.value = scale.value;
      startTx.value = tx.value;
      startTy.value = ty.value;
      forItem.value = target.selectedId.value !== '';
      if (forItem.value) {
        target.scale.value = 1;
        target.rotation.value = 0;
        target.active.value = 1;
      }
    };
    const endTwoFingers = () => {
      'worklet';
      if (pinchDown.value || turnDown.value) return;
      pinching.value = false;
      if (forItem.value) {
        target.active.value = 0;
        forItem.value = false;
      } else {
        scheduleOnRN(settle);
      }
    };

    const pinch = Gesture.Pinch()
      .onStart(() => {
        beginTwoFingers();
        pinchDown.value = true;
      })
      .onUpdate((e) => {
        if (forItem.value) {
          target.scale.value = e.scale;
          return;
        }
        const next = Math.min(fitShared.value * MAX_ZOOM, Math.max(fitShared.value, startScale.value * e.scale));
        const k = next / startScale.value;
        scale.value = next;
        tx.value = clampAxis(e.focalX - (e.focalX - startTx.value) * k, sizeW.value, pageWidth * next);
        ty.value = clampAxis(e.focalY - (e.focalY - startTy.value) * k, sizeH.value - bottomRoom, pageHeight * next);
      })
      .onFinalize(() => {
        if (!pinchDown.value) return;
        pinchDown.value = false;
        endTwoFingers();
      });

    // Turning only does something for the selected item; the page itself does not turn.
    const turn = Gesture.Rotation()
      .onStart(() => {
        beginTwoFingers();
        turnDown.value = true;
      })
      .onUpdate((e) => {
        if (forItem.value) target.rotation.value = e.rotation;
      })
      .onFinalize(() => {
        if (!turnDown.value) return;
        turnDown.value = false;
        endTwoFingers();
      });

    const pan = Gesture.Pan()
      .maxPointers(2)
      .onStart((e) => {
        const s = scale.value > 0 ? scale.value : 1;
        scheduleOnRN(onBackgroundDrag, (e.x - tx.value) / s, (e.y - ty.value) / s);
      })
      .onChange((e) => {
        if (pinching.value) return;
        tx.value = clampAxis(tx.value + e.changeX, sizeW.value, pageWidth * scale.value);
        ty.value = clampAxis(ty.value + e.changeY, sizeH.value - bottomRoom, pageHeight * scale.value);
      })
      .onEnd((e) => {
        // Only with the whole page in view (zoomed in, a sideways drag moves the view instead).
        if (pinching.value || scale.value > fitShared.value * ZOOMED_THRESHOLD) return;
        const sideways = Math.abs(e.translationX) > SWIPE_DISTANCE && Math.abs(e.translationX) > Math.abs(e.translationY) * SWIPE_STRAIGHTNESS;
        if (sideways) scheduleOnRN(onSwipe, e.translationX < 0 ? 1 : -1);
      });

    const tap = Gesture.Tap().onEnd(() => scheduleOnRN(onBackgroundTap));
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd((e) => scheduleOnRN(zoomToggle, e.x, e.y));

    return Gesture.Simultaneous(pinch, turn, pan, tap, doubleTap);
  }, [
    pinching,
    forItem,
    pinchDown,
    turnDown,
    target,
    startScale,
    startTx,
    startTy,
    scale,
    tx,
    ty,
    fitShared,
    sizeW,
    sizeH,
    pageWidth,
    pageHeight,
    bottomRoom,
    settle,
    onBackgroundTap,
    onBackgroundDrag,
    onSwipe,
    zoomToggle,
  ]);

  // Mouse wheel (web): zooms around the pointer.
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const node = viewportRef.current as unknown as HTMLElement | null;
    if (!node) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const focusX = event.clientX - rect.left;
      const focusY = event.clientY - rect.top;
      const next = Math.min(fit * MAX_ZOOM, Math.max(fit, scale.value * Math.exp(-event.deltaY * WHEEL_SPEED)));
      const k = next / scale.value;
      scale.value = next;
      tx.value = clampAxis(focusX - (focusX - tx.value) * k, viewport.width, pageWidth * next);
      ty.value = clampAxis(focusY - (focusY - ty.value) * k, viewport.height - bottomRoom, pageHeight * next);
      clearTimeout(timer);
      timer = setTimeout(settle, WHEEL_SETTLE_MS);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      clearTimeout(timer);
      node.removeEventListener('wheel', onWheel);
    };
  }, [fit, scale, tx, ty, viewport, pageWidth, pageHeight, bottomRoom, settle, viewportRef]);

  const layerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: renderScale > 0 ? scale.value / renderScale : 1 }],
  }));

  /** What is on screen, as a rectangle of the page (it may reach past the page when zoomed out). */
  const visibleRegion = useCallback((): Rect => {
    const s = scale.value > 0 ? scale.value : 1;
    return {
      left: -tx.value / s,
      top: -ty.value / s,
      right: (viewport.width - tx.value) / s,
      bottom: (viewport.height - bottomRoom - ty.value) / s,
    };
  }, [scale, tx, ty, viewport, bottomRoom]);

  /** A point on the window (where a finger touched) as a point of the page. */
  const pageFromWindow = useCallback(
    (windowX: number, windowY: number): Promise<Point> =>
      new Promise((resolve) => {
        const node = viewportRef.current;
        if (!node) {
          resolve({ x: -1, y: -1 });
          return;
        }
        node.measureInWindow((originX, originY) => {
          const s = scale.value > 0 ? scale.value : 1;
          resolve({ x: (windowX - originX - tx.value) / s, y: (windowY - originY - ty.value) / s });
        });
      }),
    [scale, tx, ty],
  );

  /** How far the page is zoomed in compared to "whole page" (1 = whole page). */
  const zoomFactor = useCallback((): number => (fit > 0 ? Math.max(scale.value / fit, 1) : 1), [fit, scale]);

  /** The middle of what is on screen, as a point of the page (new items appear there). */
  const visibleCenter = useCallback((): PagePoint => {
    const s = scale.value > 0 ? scale.value : 1;
    const x = (viewport.width / 2 - tx.value) / s;
    const y = ((viewport.height - bottomRoom) / 2 - ty.value) / s;
    return {
      x: Math.min(pageWidth, Math.max(0, x)),
      y: Math.min(pageHeight, Math.max(0, y)),
    };
  }, [scale, tx, ty, viewport, bottomRoom, pageWidth, pageHeight]);

  return {
    viewportRef,
    view: {
      onViewportLayout,
      ready: fit > 0,
      fit,
      renderScale,
      scale,
      tx,
      ty,
      gesture,
      layerStyle,
      visibleCenter,
    visibleRegion,
    zoomFactor,
    pageFromWindow,
      isZoomed: renderScale > fit * 1.05,
      zoomIn,
      zoomOut,
      zoomFit,
    },
  };
}
