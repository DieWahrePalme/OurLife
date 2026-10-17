/* eslint-disable react-hooks/immutability -- Reanimated values are written with `.value =` inside gesture worklets; they are not React state. */
import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { strings } from '@/constants/strings';
import { useGoalsStore } from '@/features/goals/goals-store';
import { ItemContent } from './item-content';
import { moodFor } from './moods';
import { isKlipyUrl } from './klipy';
import { isCloudPhoto } from './photo-cloud';
import { keepOnPage } from './layout';
import { PAGE_HEIGHT, PAGE_WIDTH } from './page-size';
import { useItemMotion } from './use-item-motion';
import type { TwoFingerTarget } from './use-two-finger';
import { MAX_BOX_WIDTH, MAX_SCALE, MIN_BOX_WIDTH, MIN_SCALE, type CanvasItem, type ItemKind } from './types';

interface CanvasItemViewProps {
  item: CanvasItem;
  /** Live scale of the page on screen (fit and zoom); drags are divided by it so items follow the finger. */
  canvasScale: SharedValue<number>;
  /** Scale the page is laid out at. Everything of the item is drawn this much bigger, so it stays sharp when zoomed in. */
  renderScale: number;
  selected: boolean;
  /** Pulses briefly (a new item, so it is easy to find). */
  highlight: boolean;
  /** Two-finger pinch and turn for the selected item come in here. */
  twoFingers: TwoFingerTarget;
  /** Padlocks of locked items are only shown while the page is being worked on. */
  showPadlock: boolean;
  /** Changes to a new number each time the item should shake (a drag on a locked item). */
  shakeTick: number;
  onSelect: (id: string) => void;
  /** A tap on the item, with where it was on screen. Tapping the selected item again can pick what is under it. */
  onTap: (id: string, screenX: number, screenY: number) => void;
  /** Reports the box of the item at scale 1 (page pixels), so the page can find free room and hit the right item. */
  onMeasured: (id: string, width: number, height: number) => void;
  onEdit: (id: string) => void;
  onChange: (id: string, patch: Partial<CanvasItem>) => void;
  onRemove: (id: string) => void;
}

const ITEM_ACTIONS = [
  { name: 'activate', label: 'Select' },
  { name: 'edit', label: 'Edit' },
  { name: 'lock', label: 'Lock' },
  { name: 'unlock', label: 'Unlock' },
  { name: 'delete', label: 'Delete' },
];
const EDITABLE_KINDS: readonly ItemKind[] = ['text', 'todo', 'focus', 'goal', 'photo'];
/** Kinds whose box can be made wider or narrower while the letters keep their size. */
const WIDTH_KINDS: readonly ItemKind[] = ['text', 'focus', 'todo'];
const DEG_PER_RAD = 180 / Math.PI;
/** Space between an item and its dashed frame, at scale 1 (page pixels). */
const ITEM_PADDING = 6;
const HANDLE_SIZE = 26;
const HANDLE_SLOP = 12;
const BADGE_SIZE = 22;
/** The turn handle floats this far (page pixels at scale 1) above the frame. */
const ROTATE_HANDLE_GAP = 30;
/** A turn this close to a right angle clicks into it (degrees). */
const SNAP_DEGREES = 4;

function labelFor(item: CanvasItem, goalName: string | undefined): string {
  if (item.kind === 'tape') return 'Washi tape';
  if (item.kind === 'drawing') return 'Drawing';
  if (item.kind === 'photo') return strings.photoLabel;
  if (item.kind === 'todo') return strings.todoTitle;
  if (item.kind === 'mood') return moodFor(item.content).label;
  if (item.kind === 'goal') return `${goalName ?? 'Goal'} ${item.amount ?? ''}`.trim();
  if (item.kind === 'sticker') return isKlipyUrl(item.content) || isCloudPhoto(item.content) ? strings.stickerLabel : `Sticker ${item.content}`;
  return item.content;
}

interface Measured {
  w: number;
  h: number;
  /** The enlargement the size was measured at. */
  zoom: number;
}

function CanvasItemViewBase({ item, canvasScale, renderScale, selected, highlight, twoFingers, showPadlock, shakeTick, onSelect, onTap, onMeasured, onEdit, onChange, onRemove }: CanvasItemViewProps) {
  const goalName = useGoalsStore((state) => state.goals.find((g) => g.id === item.content)?.name);
  /** Drawn size of the item compared to its base size: its own enlargement times the page's. */
  const zoom = item.scale * renderScale;
  const locked = item.locked === true;
  const hasWidth = WIDTH_KINDS.includes(item.kind);
  const [measured, setMeasured] = useState<Measured>({ w: 0, h: 0, zoom });
  /** Width while the side handle is dragged. Only counts while the saved width is still the one the drag started from. */
  const [live, setLive] = useState<{ base: number | undefined; width: number } | null>(null);

  const { x, y, rotation, ratio } = useItemMotion(item);
  const sizeW = useSharedValue(0);
  const sizeH = useSharedValue(0);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startRatio = useSharedValue(1);
  const startRotation = useSharedValue(0);
  const startWidth = useSharedValue(0);
  const pivotX = useSharedValue(0);
  const pivotY = useSharedValue(0);
  const fingerX = useSharedValue(0);
  const fingerY = useSharedValue(0);
  const widthNow = useSharedValue(0);

  /** Box of the item at scale 1, in page pixels (zero before it was measured). */
  const box = { w: measured.w / measured.zoom, h: measured.h / measured.zoom };
  /** After a drag, resize or turn at least a third of the item stays on the page. */
  const pulledBack = (next: CanvasItem): Pick<CanvasItem, 'x' | 'y'> =>
    box.w > 0 ? keepOnPage(next, box, { w: PAGE_WIDTH, h: PAGE_HEIGHT }) : { x: next.x, y: next.y };

  const commit = (nextX: number, nextY: number, nextRatio: number, nextRotationRad: number) => {
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, item.scale * nextRatio));
    const next = { ...item, x: nextX, y: nextY, scale: nextScale, rotation: nextRotationRad * DEG_PER_RAD };
    onChange(item.id, { ...pulledBack(next), scale: nextScale, rotation: next.rotation });
  };
  const commitWidth = (width: number, nextX: number, nextY: number) => {
    if (width === item.width) setLive(null);
    else onChange(item.id, { width, ...pulledBack({ ...item, width, x: nextX, y: nextY }) });
  };

  const showLiveWidth = (width: number) => setLive({ base: item.width, width });

  const minRatio = MIN_SCALE / item.scale;
  const maxRatio = MAX_SCALE / item.scale;

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
      scheduleOnRN(onSelect, item.id);
    })
    .onUpdate((e) => {
      const divisor = canvasScale.value > 0 ? canvasScale.value : 1;
      x.value = startX.value + e.translationX / divisor;
      y.value = startY.value + e.translationY / divisor;
    })
    .onEnd(() => scheduleOnRN(commit, x.value, y.value, ratio.value, rotation.value));

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startRatio.value = ratio.value;
    })
    .onUpdate((e) => {
      ratio.value = Math.min(maxRatio, Math.max(minRatio, startRatio.value * e.scale));
    })
    .onEnd(() => scheduleOnRN(commit, x.value, y.value, ratio.value, rotation.value));

  const rotate = Gesture.Rotation()
    .onStart(() => {
      startRotation.value = rotation.value;
    })
    .onUpdate((e) => {
      rotation.value = startRotation.value + e.rotation;
    })
    .onEnd(() => scheduleOnRN(commit, x.value, y.value, ratio.value, rotation.value));

  const tap = Gesture.Tap().onEnd((e) => scheduleOnRN(onTap, item.id, e.absoluteX, e.absoluteY));
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (EDITABLE_KINDS.includes(item.kind)) scheduleOnRN(onEdit, item.id);
    });

  // A tap selects at once (no waiting to see whether a second tap follows); the second tap of a double tap edits.
  const gesture = Gesture.Simultaneous(pan, pinch, rotate, tap, doubleTap);

  /** Corner handle: drag outwards to enlarge, inwards to shrink. The opposite (top-left) corner stays where it is. */
  const resize = Gesture.Pan()
    .onStart(() => {
      startRatio.value = ratio.value;
      startX.value = x.value;
      startY.value = y.value;
      scheduleOnRN(onSelect, item.id);
    })
    .onUpdate((e) => {
      const divisor = canvasScale.value > 0 ? canvasScale.value : 1;
      const tx = e.translationX / divisor;
      const ty = e.translationY / divisor;
      const cos = Math.cos(rotation.value);
      const sin = Math.sin(rotation.value);
      // The finger's move along the item's own diagonal (from the middle to the bottom-right corner).
      const localX = tx * cos + ty * sin;
      const localY = -tx * sin + ty * cos;
      const widthInPage = sizeW.value / renderScale;
      const heightInPage = sizeH.value / renderScale;
      const diagonal = Math.max(Math.hypot(widthInPage, heightInPage), 1);
      const along = (localX * widthInPage + localY * heightInPage) / diagonal;
      const next = Math.min(maxRatio, Math.max(minRatio, startRatio.value * (1 + along / diagonal)));
      ratio.value = next;
      // Growing happens around the middle; moving the middle by half the growth keeps the top-left corner in place.
      const grow = (next / startRatio.value - 1) / 2;
      x.value = startX.value + grow * (widthInPage * cos - heightInPage * sin);
      y.value = startY.value + grow * (widthInPage * sin + heightInPage * cos);
    })
    .onEnd(() => {
      scheduleOnRN(commit, x.value, y.value, ratio.value, rotation.value);
      scheduleOnRN(onSelect, item.id);
    });

  /** Turn handle above the item: one finger (or a mouse) turns it around its middle, with a light click at right angles. */
  const turn = Gesture.Pan()
    .onBegin((e) => {
      startRotation.value = rotation.value;
      // The finger starts on the handle, which sits straight "up" from the middle of the item; that gives the middle.
      const layerToScreen = (canvasScale.value / renderScale) * ratio.value;
      const distance = (sizeH.value / 2 + ROTATE_HANDLE_GAP) * layerToScreen;
      pivotX.value = e.absoluteX - Math.sin(rotation.value) * distance;
      pivotY.value = e.absoluteY + Math.cos(rotation.value) * distance;
      fingerX.value = e.absoluteX;
      fingerY.value = e.absoluteY;
    })
    .onStart(() => {
      scheduleOnRN(onSelect, item.id);
    })
    .onUpdate((e) => {
      const startAngle = Math.atan2(fingerY.value - pivotY.value, fingerX.value - pivotX.value);
      const nowAngle = Math.atan2(fingerY.value + e.translationY - pivotY.value, fingerX.value + e.translationX - pivotX.value);
      let next = startRotation.value + (nowAngle - startAngle);
      const degrees = (next * 180) / Math.PI;
      const nearest = Math.round(degrees / 90) * 90;
      if (Math.abs(degrees - nearest) < SNAP_DEGREES) next = (nearest * Math.PI) / 180;
      rotation.value = next;
    })
    .onEnd(() => {
      scheduleOnRN(commit, x.value, y.value, ratio.value, rotation.value);
      scheduleOnRN(onSelect, item.id);
    });

  /** Side handle of a text box: changes the width only, the letters keep their size and the text wraps again. */
  const stretch = Gesture.Pan()
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
      startWidth.value = sizeW.value / zoom - ITEM_PADDING * 2;
      widthNow.value = startWidth.value;
      scheduleOnRN(onSelect, item.id);
    })
    .onUpdate((e) => {
      const divisor = canvasScale.value > 0 ? canvasScale.value : 1;
      const tx = e.translationX / divisor;
      const ty = e.translationY / divisor;
      const cos = Math.cos(rotation.value);
      const sin = Math.sin(rotation.value);
      const localX = tx * cos + ty * sin;
      const next = Math.min(MAX_BOX_WIDTH, Math.max(MIN_BOX_WIDTH, startWidth.value + localX / item.scale));
      const delta = next - startWidth.value;
      // The box grows to the right of its left edge, so its middle (the turning point) moves half as far.
      x.value = startX.value + (delta * (item.scale * cos - 1)) / 2;
      y.value = startY.value + (delta * item.scale * sin) / 2;
      widthNow.value = next;
      scheduleOnRN(showLiveWidth, next);
    })
    .onEnd(() => {
      scheduleOnRN(commitWidth, widthNow.value, x.value, y.value);
      scheduleOnRN(onSelect, item.id);
    });

  // A scaled box grows from its middle; this puts its top-left corner where the saved x / y say.
  const baseWidth = measured.w / measured.zoom;
  const baseHeight = measured.h / measured.zoom;
  const shiftX = ((-baseWidth * (item.scale - 1)) / 2) * renderScale;
  const shiftY = ((-baseHeight * (item.scale - 1)) / 2) * renderScale;

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (highlight) pulse.value = withSequence(withTiming(1.12, { duration: 160 }), withTiming(1, { duration: 280 }));
  }, [highlight, pulse]);

  const shake = useSharedValue(0);
  useEffect(() => {
    if (shakeTick > 0) {
      shake.value = withSequence(
        withTiming(-9, { duration: 50 }),
        withTiming(9, { duration: 90 }),
        withTiming(-6, { duration: 80 }),
        withTiming(6, { duration: 70 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [shakeTick, shake]);

  // Two fingers anywhere on the page (see use-two-finger.ts): if this item is the selected one, it follows them.
  useAnimatedReaction(
    () => ({ active: twoFingers.active.value, factor: twoFingers.scale.value, turn: twoFingers.rotation.value }),
    (now, before) => {
      if (twoFingers.selectedId.value !== item.id) return;
      const wasActive = before !== null && before.active === 1;
      if (now.active === 1) {
        if (!wasActive) {
          startRatio.value = ratio.value;
          startRotation.value = rotation.value;
        }
        ratio.value = Math.min(maxRatio, Math.max(minRatio, startRatio.value * now.factor));
        rotation.value = startRotation.value + now.turn;
      } else if (wasActive) {
        scheduleOnRN(commit, x.value, y.value, ratio.value, rotation.value);
      }
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value * renderScale + shiftX + shake.value },
      { translateY: y.value * renderScale + shiftY },
      { rotate: `${rotation.value}rad` },
      { scale: ratio.value * pulse.value },
    ],
  }));

  /** Handles and the padlock keep their size on screen, however far the page is zoomed. */
  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: renderScale / (canvasScale.value * ratio.value) }],
  }));

  const shown = useMemo(() => (live !== null && live.base === item.width ? { ...item, width: live.width } : item), [item, live]);
  const notMeasuredYet = item.scale !== 1 && measured.w === 0;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.item, animatedStyle, notMeasuredYet && styles.hidden]}>
      <View
        collapsable={false}
        pointerEvents="box-none"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          sizeW.value = width;
          sizeH.value = height;
          setMeasured((previous) =>
            previous.w === width && previous.h === height && previous.zoom === zoom ? previous : { w: width, h: height, zoom },
          );
          onMeasured(item.id, width / zoom, height / zoom);
        }}
        style={[styles.frame, { padding: ITEM_PADDING * zoom }, selected && !locked && styles.selected]}
      >
        {/* Only the item itself takes touches, not the frame around it (and for text only the lines). */}
        <GestureDetector gesture={gesture}>
          <View
            collapsable={false}
            pointerEvents={locked ? 'none' : item.kind === 'text' ? 'box-none' : 'auto'}
            accessible={item.kind !== 'todo'}
            accessibilityRole="button"
            accessibilityLabel={labelFor(item, goalName)}
            accessibilityState={{ selected }}
            accessibilityHint={locked ? 'Locked. Use the unlock action to change it' : 'Drag to move, pinch to resize, twist to rotate'}
            accessibilityActions={ITEM_ACTIONS}
            onAccessibilityAction={(e) => {
              const action = e.nativeEvent.actionName;
              if (action === 'delete') onRemove(item.id);
              else if (action === 'edit') onEdit(item.id);
              else if (action === 'lock') onChange(item.id, { locked: true });
              else if (action === 'unlock') onChange(item.id, { locked: false });
              else onSelect(item.id);
            }}
          >
            <ItemContent item={shown} zoom={zoom} inert={locked} onChange={onChange} />
          </View>
        </GestureDetector>
      </View>

      {selected && !locked ? (
        <>
          {hasWidth ? (
            <GestureDetector gesture={stretch}>
              <Animated.View accessible accessibilityRole="adjustable" accessibilityLabel={strings.widthHandle} style={[styles.widthHit, handleStyle]} hitSlop={HANDLE_SLOP}>
                <View style={styles.widthGrip} />
              </Animated.View>
            </GestureDetector>
          ) : null}
          <GestureDetector gesture={turn}>
            <Animated.View accessible accessibilityRole="adjustable" accessibilityLabel={strings.rotateHandle} style={[styles.turnHit, handleStyle]} hitSlop={HANDLE_SLOP}>
              <View style={styles.resizeGrip}>
                <Ionicons name="refresh" size={15} color="#FFFFFF" />
              </View>
            </Animated.View>
          </GestureDetector>
          <GestureDetector gesture={resize}>
            <Animated.View accessible accessibilityRole="adjustable" accessibilityLabel={strings.resizeHandle} style={[styles.resizeHit, handleStyle]} hitSlop={HANDLE_SLOP}>
              <View style={styles.resizeGrip}>
                <Ionicons name="resize" size={14} color="#FFFFFF" />
              </View>
            </Animated.View>
          </GestureDetector>
        </>
      ) : null}

      {selected && !locked ? (
        <Animated.View style={[styles.deleteBadge, handleStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.delete}
            hitSlop={HANDLE_SLOP}
            onPress={() => onRemove(item.id)}
            style={styles.badgeHit}
          >
            <Ionicons name="trash" size={13} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      ) : null}

      {locked && showPadlock ? (
        <Animated.View style={[styles.badge, handleStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.unlockItem}
            hitSlop={HANDLE_SLOP}
            onPress={() => onChange(item.id, { locked: false })}
            style={styles.badgeHit}
          >
            <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export const CanvasItemView = memo(CanvasItemViewBase);

const styles = StyleSheet.create({
  item: { position: 'absolute', left: 0, top: 0 },
  hidden: { opacity: 0 },
  frame: { borderRadius: 8, borderWidth: 1.5, borderColor: 'transparent' },
  selected: { borderColor: '#8A8794', borderStyle: 'dashed' },
  widthHit: { position: 'absolute', right: -11, top: '50%', marginTop: -16, width: 22, height: 32, alignItems: 'center', justifyContent: 'center' },
  widthGrip: { width: 8, height: 30, borderRadius: 4, backgroundColor: '#3D6FD8', borderWidth: 1.5, borderColor: '#FFFFFF' },
  resizeHit: { position: 'absolute', right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2, width: HANDLE_SIZE, height: HANDLE_SIZE },
  resizeGrip: { flex: 1, borderRadius: HANDLE_SIZE / 2, backgroundColor: '#3D6FD8', borderWidth: 1.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: 3, top: 3, opacity: 0.85, width: BADGE_SIZE, height: BADGE_SIZE, borderRadius: BADGE_SIZE / 2, backgroundColor: '#5B5868', borderWidth: 1.5, borderColor: '#FFFFFF' },
  turnHit: { position: 'absolute', left: '50%', marginLeft: -HANDLE_SIZE / 2, top: -(ROTATE_HANDLE_GAP + HANDLE_SIZE / 2), width: HANDLE_SIZE, height: HANDLE_SIZE },
  deleteBadge: { position: 'absolute', left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2, width: HANDLE_SIZE, height: HANDLE_SIZE, borderRadius: HANDLE_SIZE / 2, backgroundColor: '#B42318', borderWidth: 1.5, borderColor: '#FFFFFF' },
  badgeHit: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
