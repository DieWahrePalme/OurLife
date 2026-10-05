import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { strings } from '@/constants/strings';
import { ItemContent } from './item-content';
import { MAX_SCALE, MIN_SCALE, type CanvasItem, type ItemKind } from './types';

interface CanvasItemViewProps {
  item: CanvasItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onChange: (id: string, patch: Partial<CanvasItem>) => void;
}

const EDITABLE_KINDS: readonly ItemKind[] = ['text', 'todo', 'focus'];
const DEG_PER_RAD = 180 / Math.PI;

function labelFor(item: CanvasItem): string {
  if (item.kind === 'tape') return 'Washi tape';
  if (item.kind === 'photo') return strings.photoLabel;
  if (item.kind === 'todo') return strings.todoTitle;
  return item.content;
}

function CanvasItemViewBase({ item, selected, onSelect, onEdit, onChange }: CanvasItemViewProps) {
  const x = useSharedValue(item.x);
  const y = useSharedValue(item.y);
  const scale = useSharedValue(item.scale);
  const rotation = useSharedValue(item.rotation / DEG_PER_RAD);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startRotation = useSharedValue(0);

  const commit = (nextX: number, nextY: number, nextScale: number, nextRotationRad: number) => {
    onChange(item.id, { x: nextX, y: nextY, scale: nextScale, rotation: nextRotationRad * DEG_PER_RAD });
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
      scheduleOnRN(onSelect, item.id);
    })
    .onUpdate((e) => {
      x.value = startX.value + e.translationX;
      y.value = startY.value + e.translationY;
    })
    .onEnd(() => scheduleOnRN(commit, x.value, y.value, scale.value, rotation.value));

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, startScale.value * e.scale));
    })
    .onEnd(() => scheduleOnRN(commit, x.value, y.value, scale.value, rotation.value));

  const rotate = Gesture.Rotation()
    .onStart(() => {
      startRotation.value = rotation.value;
    })
    .onUpdate((e) => {
      rotation.value = startRotation.value + e.rotation;
    })
    .onEnd(() => scheduleOnRN(commit, x.value, y.value, scale.value, rotation.value));

  const tap = Gesture.Tap().onEnd(() => scheduleOnRN(onSelect, item.id));
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (EDITABLE_KINDS.includes(item.kind)) scheduleOnRN(onEdit, item.id);
    });

  const gesture = Gesture.Simultaneous(pan, pinch, rotate, Gesture.Exclusive(doubleTap, tap));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotation.value}rad` },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityLabel={labelFor(item)}
        accessibilityHint="Drag to move, pinch to resize, twist to rotate"
        style={[styles.item, animatedStyle, selected && styles.selected]}
      >
        <ItemContent item={item} onChange={onChange} />
      </Animated.View>
    </GestureDetector>
  );
}

export const CanvasItemView = memo(CanvasItemViewBase);

const styles = StyleSheet.create({
  item: { position: 'absolute', left: 0, top: 0, padding: 6, borderRadius: 8, borderWidth: 1.5, borderColor: 'transparent' },
  selected: { borderColor: '#8A8794', borderStyle: 'dashed' },
});
