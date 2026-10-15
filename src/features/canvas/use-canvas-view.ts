/* eslint-disable react-hooks/immutability -- Reanimated values are written with `.value =` in gestures and effects; they are not React state. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, type LayoutChangeEvent, type View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

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
}

/** Keeps a position inside the allowed range (worklet, also used on the JS thread). */
function clampAxis(
  position: number,
  viewport: number,
  content: number,
): number {
  "worklet";
  if (content <= viewport) return (viewport - content) / 2;
  return Math.min(
    KEEP_IN_VIEW,
    Math.max(viewport - content - KEEP_IN_VIEW, position),
  );
}

/**
 * Zoom and pan of the day page, like in a drawing program: pinch or wheel to zoom around the fingers, drag the
 * background to move, double tap to jump in and out. The page keeps its logical size; only the view moves.
 *
 * While a zoom is going on the page is stretched (smooth). Once it settles the page is laid out again at the new
 * size (`renderScale`), so text and pictures are sharp at any zoom instead of blurry.
 */
export function useCanvasView({
  pageWidth,
  pageHeight,
  padding,
  bottomRoom,
  onBackgroundTap,
}: CanvasViewOptions) {
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
  }, [
    fit,
    viewport,
    pageWidth,
    pageHeight,
    bottomRoom,
    scale,
    fitShared,
    sizeW,
    sizeH,
    tx,
    ty,
  ]);

  const settle = useCallback(() => {
    const live = scale.value;
    if (live <= 0 || fit <= 0) return;
    if (Math.abs(live / renderScale - 1) > REDRAW_RATIO)
      setDrawn({ fit, scale: live });
  }, [scale, fit, renderScale]);

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport((previous) =>
      previous.width === width && previous.height === height
        ? previous
        : { width, height },
    );
  }, []);

  /** Moves the view smoothly so that `focus` (a point on screen) stays where it is while the scale becomes `target`. */
  const zoomTo = useCallback(
    (target: number, focusX: number, focusY: number) => {
      const next = Math.min(fit * MAX_ZOOM, Math.max(fit, target));
      const k = next / scale.value;
      const nextTx = clampAxis(
        focusX - (focusX - tx.value) * k,
        viewport.width,
        pageWidth * next,
      );
      const nextTy = clampAxis(
        focusY - (focusY - ty.value) * k,
        viewport.height - bottomRoom,
        pageHeight * next,
      );
      scale.value = withTiming(next, { duration: ANIMATION_MS });
      tx.value = withTiming(nextTx, { duration: ANIMATION_MS });
      ty.value = withTiming(nextTy, { duration: ANIMATION_MS });
      setTimeout(settle, ANIMATION_MS + 40);
    },
    [fit, scale, tx, ty, viewport, pageWidth, pageHeight, bottomRoom, settle],
  );

  const middle = useCallback(
    () => ({ x: viewport.width / 2, y: (viewport.height - bottomRoom) / 2 }),
    [viewport, bottomRoom],
  );
  const zoomIn = useCallback(
    () => zoomTo(scale.value * BUTTON_ZOOM_STEP, middle().x, middle().y),
    [zoomTo, scale, middle],
  );
  const zoomOut = useCallback(
    () => zoomTo(scale.value / BUTTON_ZOOM_STEP, middle().x, middle().y),
    [zoomTo, scale, middle],
  );
  const zoomFit = useCallback(
    () => zoomTo(fit, middle().x, middle().y),
    [zoomTo, fit, middle],
  );
  const zoomToggle = useCallback(
    (focusX: number, focusY: number) =>
      zoomTo(
        scale.value > fit * 1.3 ? fit : fit * DOUBLE_TAP_ZOOM,
        focusX,
        focusY,
      ),
    [zoomTo, scale, fit],
  );

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart(() => {
        pinching.value = true;
        startScale.value = scale.value;
        startTx.value = tx.value;
        startTy.value = ty.value;
      })
      .onUpdate((e) => {
        const next = Math.min(
          fitShared.value * MAX_ZOOM,
          Math.max(fitShared.value, startScale.value * e.scale),
        );
        const k = next / startScale.value;
        scale.value = next;
        tx.value = clampAxis(
          e.focalX - (e.focalX - startTx.value) * k,
          sizeW.value,
          pageWidth * next,
        );
        ty.value = clampAxis(
          e.focalY - (e.focalY - startTy.value) * k,
          sizeH.value - bottomRoom,
          pageHeight * next,
        );
      })
      .onFinalize(() => {
        pinching.value = false;
        scheduleOnRN(settle);
      });

    const pan = Gesture.Pan()
      .maxPointers(2)
      .onChange((e) => {
        if (pinching.value) return;
        tx.value = clampAxis(
          tx.value + e.changeX,
          sizeW.value,
          pageWidth * scale.value,
        );
        ty.value = clampAxis(
          ty.value + e.changeY,
          sizeH.value - bottomRoom,
          pageHeight * scale.value,
        );
      });

    const tap = Gesture.Tap().onEnd(() => scheduleOnRN(onBackgroundTap));
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd((e) => scheduleOnRN(zoomToggle, e.x, e.y));

    return Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, tap));
  }, [
    pinching,
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
    zoomToggle,
  ]);

  // Mouse wheel (web): zooms around the pointer.
  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    const node = viewportRef.current as unknown as HTMLElement | null;
    if (!node) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const focusX = event.clientX - rect.left;
      const focusY = event.clientY - rect.top;
      const next = Math.min(
        fit * MAX_ZOOM,
        Math.max(fit, scale.value * Math.exp(-event.deltaY * WHEEL_SPEED)),
      );
      const k = next / scale.value;
      scale.value = next;
      tx.value = clampAxis(
        focusX - (focusX - tx.value) * k,
        viewport.width,
        pageWidth * next,
      );
      ty.value = clampAxis(
        focusY - (focusY - ty.value) * k,
        viewport.height - bottomRoom,
        pageHeight * next,
      );
      clearTimeout(timer);
      timer = setTimeout(settle, WHEEL_SETTLE_MS);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      clearTimeout(timer);
      node.removeEventListener("wheel", onWheel);
    };
  }, [
    fit,
    scale,
    tx,
    ty,
    viewport,
    pageWidth,
    pageHeight,
    bottomRoom,
    settle,
    viewportRef,
  ]);

  const layerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: renderScale > 0 ? scale.value / renderScale : 1 },
    ],
  }));

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
      gesture,
      layerStyle,
      visibleCenter,
      isZoomed: renderScale > fit * 1.05,
      zoomIn,
      zoomOut,
      zoomFit,
    },
  };
}
