import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { strings } from '@/constants/strings';
import { MAX_SCALE, MIN_SCALE, type CanvasItem } from './types';

interface CanvasItemViewProps {
  item: CanvasItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onChange: (id: string, patch: Partial<CanvasItem>) => void;
}

const TAPE_WIDTH = 120;
const TAPE_HEIGHT = 34;
const STICKER_SIZE = 56;
const PHOTO_WIDTH = 200;
const DEG_PER_RAD = 180 / Math.PI;

function Content({ item }: { item: CanvasItem }) {
  if (item.kind === 'sticker') return <Text style={styles.sticker}>{item.content}</Text>;
  if (item.kind === 'photo') {
    return (
      <View style={styles.polaroid}>
        <Image source={{ uri: item.content }} style={{ width: PHOTO_WIDTH, aspectRatio: item.aspect ?? 1 }} contentFit="cover" accessibilityLabel={strings.photoLabel} />
      </View>
    );
  }
  if (item.kind === 'tape') return <View style={[styles.tape, { backgroundColor: item.color }]} />;
  return <Text style={[styles.text, { color: item.color }]}>{item.content}</Text>;
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
      if (item.kind === 'text') scheduleOnRN(onEdit, item.id);
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
        accessibilityLabel={item.kind === 'tape' ? 'Washi tape' : item.kind === 'photo' ? strings.photoLabel : item.content}
        accessibilityHint="Drag to move, pinch to resize, twist to rotate"
        style={[styles.item, animatedStyle, selected && styles.selected]}
      >
        <Content item={item} />
      </Animated.View>
    </GestureDetector>
  );
}

export const CanvasItemView = memo(CanvasItemViewBase);

const styles = StyleSheet.create({
  item: { position: 'absolute', left: 0, top: 0, padding: 6, borderRadius: 8, borderWidth: 1.5, borderColor: 'transparent' },
  selected: { borderColor: '#8A8794', borderStyle: 'dashed' },
  sticker: { fontSize: STICKER_SIZE },
  text: { fontFamily: 'Caveat_700Bold', fontSize: 30, lineHeight: 42, maxWidth: 260 },
  polaroid: { backgroundColor: '#fff', padding: 8, paddingBottom: 22, borderRadius: 3, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  tape: { width: TAPE_WIDTH, height: TAPE_HEIGHT, opacity: 0.8, borderRadius: 2 },
});
