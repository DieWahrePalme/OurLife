import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { moodFor } from '@/features/canvas/moods';
import type { DaySummary } from '@/features/days/day-summary';

export type DotState = 'past' | 'today' | 'future';

interface DayDotProps {
  dayNumber: number;
  state: DotState;
  cell: number;
  label: string;
  summary?: DaySummary;
  /** Something new from another phone on this day. */
  isNew?: boolean;
  /** "100" or "1y" on a milestone day, otherwise null. */
  milestone: string | null;
  colors: PaletteColors;
  onPress: (dayNumber: number) => void;
}

const DOT_RATIO = 0.6;
const MILESTONE_RATIO = 0.84;
const RING_RATIO = 0.95;
const MOOD_RATIO = 0.4;
const MILESTONE_FONT = 11;
/** Hex alpha (about 20%) so a past day without entries is a soft pink disc, clearly not a future ring. */
const EMPTY_PAST_TINT = '33';
const EMPTY_PAST_BORDER = 2;
const FUTURE_BORDER = 1.5;

function fillFor(state: DotState, filled: boolean, colors: PaletteColors): string {
  if (state === 'today') return colors.today;
  if (state !== 'past') return 'transparent';
  return filled ? colors.dotPast : `${colors.dotPast}${EMPTY_PAST_TINT}`;
}

function outlineFor(state: DotState, colors: PaletteColors): string {
  return state === 'future' ? colors.dotFuture : colors.dotPast;
}

function DayDotBase({ dayNumber, state, cell, label, summary, isNew = false, milestone, colors, onPress }: DayDotProps) {
  const dot = Math.round(cell * (milestone !== null ? MILESTONE_RATIO : DOT_RATIO));
  const ring = Math.round(cell * RING_RATIO);
  const moods = (summary?.moods ?? (summary?.mood ? [summary.mood] : [])).map(moodFor);
  const filled = summary?.filled === true;
  const solid = state === 'today' || (state === 'past' && filled);
  const hollow = !solid;
  const textColor = solid ? colors.onAccent : state === 'future' ? colors.inkSoft : colors.dotPast;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: state === 'today' }}
      onPress={() => onPress(dayNumber)}
      style={[styles.cell, { width: cell, height: cell }]}
    >
      {state === 'today' ? (
        <View style={[styles.ring, { width: ring, height: ring, borderRadius: ring / 2, borderColor: colors.today }]} />
      ) : null}
      <View
        style={[
          styles.dot,
          {
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: fillFor(state, filled, colors),
            borderWidth: !hollow ? 0 : state === 'future' ? FUTURE_BORDER : EMPTY_PAST_BORDER,
            borderColor: outlineFor(state, colors),
          },
        ]}
      >
        {milestone !== null ? (
          <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={[styles.milestone, { color: textColor }]}>
            {milestone}
          </Text>
        ) : moods.length > 0 && !hollow ? (
          // Two moods on one day: the small disc is split in two colours.
          <View style={[styles.mood, { width: dot * MOOD_RATIO, height: dot * MOOD_RATIO, borderRadius: dot }]}>
            {moods.map((mood) => (
              <View key={mood.key} style={{ flex: 1, backgroundColor: mood.color }} />
            ))}
          </View>
        ) : null}
      </View>
      {isNew ? <View style={[styles.newMark, { backgroundColor: colors.today }]} /> : null}
    </Pressable>
  );
}

export const DayDot = memo(DayDotBase);

const styles = StyleSheet.create({
  cell: { alignItems: 'center', justifyContent: 'center' },
  newMark: { position: 'absolute', right: 3, top: 3, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: '#FFFFFF' },
  ring: { position: 'absolute', borderWidth: 1.5 },
  dot: { alignItems: 'center', justifyContent: 'center' },
  mood: { flexDirection: 'row', overflow: 'hidden' },
  milestone: { fontSize: MILESTONE_FONT, fontWeight: '700', paddingHorizontal: 1 },
});
