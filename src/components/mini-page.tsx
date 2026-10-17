import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { estimateSize } from '@/features/canvas/layout';
import { moodFor } from '@/features/canvas/moods';
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/features/canvas/page-size';
import { usePhotoUri } from '@/features/canvas/photo-cloud';
import { penInk } from '@/features/canvas/types';
import type { DaySummary, SketchItem } from '@/features/days/day-summary';
import type { DotState } from '@/components/day-dot';

interface MiniPageProps {
  dayNumber: number;
  state: DotState;
  width: number;
  label: string;
  summary?: DaySummary;
  /** "100" / "1y" on a milestone day. */
  milestone: string | null;
  /** True when something on this day came from another phone since the last visit. */
  isNew: boolean;
  colors: PaletteColors;
  onPress: (dayNumber: number) => void;
}

/** Most items drawn on one little page; the rest would be invisible at this size anyway. */
const MAX_SHAPES = 28;
const STICKER_COLOR = '#F2B544';
const TAPE_OPACITY = 0.75;
const PAPER_RATIO = PAGE_HEIGHT / PAGE_WIDTH;

/** Rough box of an item at scale 1, without knowing the words on it. */
function boxOf(item: SketchItem): { w: number; h: number } {
  if (item.kind === 'text') return { w: item.width ? item.width + 12 : 150, h: 56 };
  if (item.kind === 'todo') return { w: (item.width ?? 210) + 24, h: 150 };
  return estimateSize({ kind: item.kind, content: item.content ?? '', aspect: item.aspect, tasks: undefined, width: item.width, font: undefined, textSize: undefined });
}

function Shape({ item, factor, photo }: { item: SketchItem; factor: number; photo: boolean }) {
  const box = boxOf(item);
  const w = box.w * factor;
  const h = box.h * factor;
  const placed = {
    position: 'absolute' as const,
    left: item.x * factor,
    top: item.y * factor,
    width: w,
    height: h,
    transform: [{ rotate: `${item.rotation}deg` }, { scale: item.scale }],
  };
  const ink = penInk(item.color);
  switch (item.kind) {
    case 'text':
      return (
        <View style={[placed, styles.centred]}>
          <View style={[styles.bar, { width: '86%', backgroundColor: ink }]} />
          <View style={[styles.bar, { width: '55%', backgroundColor: ink, alignSelf: 'flex-start', marginLeft: '7%' }]} />
        </View>
      );
    case 'photo':
      return <PhotoShape item={item} style={placed} showPicture={photo} />;
    case 'tape':
      return <View style={[placed, { backgroundColor: item.color, opacity: TAPE_OPACITY, borderRadius: 1 }]} />;
    case 'mood':
      return <View style={[placed, styles.pill, { backgroundColor: moodFor(item.content ?? '').color }]} />;
    case 'goal':
      return <View style={[placed, styles.pill, { borderColor: ink, borderWidth: 1, backgroundColor: '#FFFFFF' }]} />;
    case 'todo':
    case 'focus':
      return (
        <View style={[placed, styles.card, { borderColor: ink }]}>
          <View style={[styles.bar, { width: '45%', backgroundColor: ink }]} />
          <View style={[styles.bar, { width: '70%', backgroundColor: '#B9B4C2' }]} />
        </View>
      );
    default:
      return <View style={[placed, styles.sticker]} />;
  }
}

function PhotoShape({ item, style, showPicture }: { item: SketchItem; style: object; showPicture: boolean }) {
  const uri = usePhotoUri(showPicture && item.content ? item.content : '');
  return (
    <View style={[style, styles.polaroid]}>
      {showPicture && uri ? <Image source={{ uri }} style={styles.picture} contentFit="cover" recyclingKey={item.id} /> : <View style={[styles.picture, styles.pictureBlank]} />}
    </View>
  );
}

function MiniPageBase({ dayNumber, state, width, label, summary, milestone, isNew, colors, onPress }: MiniPageProps) {
  const height = Math.round(width * PAPER_RATIO);
  const factor = width / PAGE_WIDTH;
  const filled = summary?.filled === true;
  const sketch = summary?.sketch ?? [];
  const firstPhoto = sketch.find((item) => item.kind === 'photo');
  const today = state === 'today';
  const paperStyle =
    state === 'future'
      ? { borderColor: colors.dotFuture, borderStyle: 'dashed' as const, borderWidth: 1, backgroundColor: 'transparent' }
      : filled || today
        ? { borderColor: today ? colors.today : colors.line, borderWidth: today ? 2 : StyleSheet.hairlineWidth, backgroundColor: colors.sheet }
        : { borderColor: colors.dotFuture, borderWidth: 1, backgroundColor: 'transparent', opacity: 0.8 };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: today }} onPress={() => onPress(dayNumber)} style={[styles.cell, { width, height }]}>
      <View style={[styles.paper, paperStyle]}>
        {filled ? (
          <View style={styles.sketch}>
            {sketch.slice(0, MAX_SHAPES).map((item) => (
              <Shape key={item.id} item={item} factor={factor} photo={item === firstPhoto} />
            ))}
          </View>
        ) : null}
        <Text allowFontScaling={false} style={[styles.number, { color: filled || today ? '#6F6A7A' : colors.inkSoft }]}>
          {milestone ?? dayNumber}
        </Text>
        {isNew ? <View style={[styles.newMark, { backgroundColor: colors.today }]} /> : null}
      </View>
    </Pressable>
  );
}

export const MiniPage = memo(MiniPageBase);

const styles = StyleSheet.create({
  cell: { alignItems: 'center', justifyContent: 'center' },
  paper: { width: '92%', height: '94%', borderRadius: 3, overflow: 'hidden' },
  sketch: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  number: { position: 'absolute', right: 3, bottom: 1, fontSize: 9, fontWeight: '700' },
  newMark: { position: 'absolute', left: 3, top: 3, width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: '#FFFFFF' },
  centred: { justifyContent: 'center', gap: 2 },
  bar: { height: 2.5, borderRadius: 2, opacity: 0.9 },
  pill: { borderRadius: 999 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderRadius: 3, padding: 2, gap: 2, justifyContent: 'center' },
  sticker: { backgroundColor: STICKER_COLOR, borderRadius: 999, opacity: 0.9 },
  polaroid: { backgroundColor: '#FFFFFF', padding: 1.5, paddingBottom: 4, borderRadius: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: '#D8D2C6' },
  picture: { flex: 1 },
  pictureBlank: { backgroundColor: '#C9D3DE' },
});
