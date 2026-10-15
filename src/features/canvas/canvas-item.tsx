/* eslint-disable react-hooks/immutability -- Reanimated values are written with `.value =` inside gesture worklets; they are not React state. */
import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { strings } from '@/constants/strings';
import { useGoalsStore } from '@/features/goals/goals-store';
import { ItemContent } from './item-content';
import { moodFor } from './moods';
import { isKlipyUrl } from './klipy';
import { isCloudPhoto } from './photo-cloud';
import { useItemMotion } from './use-item-motion';
import { MAX_BOX_WIDTH, MAX_SCALE, MIN_BOX_WIDTH, MIN_SCALE, type CanvasItem, type ItemKind } from './types';

interface CanvasItemViewProps {
  item: CanvasItem;
  /** Live scale of the page on screen (fit and zoom); drags are divided by it so items follow the finger. */
  canvasScale: SharedValue<number>;
  /** Scale the page is laid out at. Everything of the item is drawn this much bigger, so it stays sharp when zoomed in. */
  renderScale: number;
  selected: boolean;
  onSelect: (id: string) => void;
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
const EDITABLE_KINDS: readonly ItemKind[] = ['text', 'todo', 'focus', 'goal'];
/** Kinds whose box can be made wider or narrower while the letters keep their size. */
const WIDTH_KINDS: readonly ItemKind[] = ['text', 'focus', 'todo'];
const DEG_PER_RAD = 180 / Math.PI;
/** Space between an item and its dashed frame, at scale 1 (page pixels). */
const ITEM_PADDING = 6;
const HANDLE_SIZE = 26;
const HANDLE_SLOP = 12;
const BADGE_SIZE = 22;

function labelFor(item: CanvasItem, goalName: string | undefined): string {
  if (item.kind === 'tape') return 'Washi tape';
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

function CanvasItemViewBase({ item, canvasScale, renderScale, selected, onSelect, onEdit, onChange, onRemove }: CanvasItemViewProps) {
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
  const widthNow = useSharedValue(0);

  const commit = (nextX: number, nextY: number, nextRatio: number, nextRotationRad: number) => {
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, item.scale * nextRatio));
    onChange(item.id, { x: nextX, y: nextY, scale: nextScale, rotation: nextRotationRad * DEG_PER_RAD });
  };
  const commitWidth = (width: number, nextX: number, nextY: number) => {
    if (width === item.width) setLive(null);
    else onChange(item.id, { width, x: nextX, y: nextY });
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

  const tap = Gesture.Tap().onEnd(() => scheduleOnRN(onSelect, item.id));
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (EDITABLE_KINDS.includes(item.kind)) scheduleOnRN(onEdit, item.id);
    });

  const gesture = Gesture.Simultaneous(pan, pinch, rotate, Gesture.Exclusive(doubleTap, tap));

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value * renderScale + shiftX },
      { translateY: y.value * renderScale + shiftY },
      { rotate: `${rotation.value}rad` },
      { scale: ratio.value },
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
      <GestureDetector gesture={gesture}>
        <View
          collapsable={false}
          pointerEvents={locked ? 'none' : 'auto'}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            sizeW.value = width;
            sizeH.value = height;
            setMeasured((previous) =>
              previous.w === width && previous.h === height && previous.zoom === zoom ? previous : { w: width, h: height, zoom },
            );
          }}
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
          style={[styles.frame, { padding: ITEM_PADDING * zoom }, selected && !locked && styles.selected]}
        >
          <ItemContent item={shown} zoom={zoom} onChange={onChange} />
        </View>
      </GestureDetector>

      {selected && !locked ? (
        <>
          {hasWidth ? (
            <GestureDetector gesture={stretch}>
              <Animated.View accessible accessibilityRole="adjustable" accessibilityLabel={strings.widthHandle} style={[styles.widthHit, handleStyle]} hitSlop={HANDLE_SLOP}>
                <View style={styles.widthGrip} />
              </Animated.View>
            </GestureDetector>
          ) : null}
          <GestureDetector gesture={resize}>
            <Animated.View accessible accessibilityRole="adjustable" accessibilityLabel={strings.resizeHandle} style={[styles.resizeHit, handleStyle]} hitSlop={HANDLE_SLOP}>
              <View style={styles.resizeGrip}>
                <Ionicons name="resize" size={14} color="#FFFFFF" />
              </View>
            </Animated.View>
          </GestureDetector>
        </>
      ) : null}

      {locked ? (
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
  badgeHit: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
