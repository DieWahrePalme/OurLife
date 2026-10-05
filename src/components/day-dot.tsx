import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';

export type DotState = 'past' | 'today' | 'future';

interface DayDotProps {
  dayNumber: number;
  state: DotState;
  cell: number;
  label: string;
  colors: PaletteColors;
  onPress: (dayNumber: number) => void;
}

const DOT_RATIO = 0.6;
const RING_RATIO = 0.95;

function DayDotBase({ dayNumber, state, cell, label, colors, onPress }: DayDotProps) {
  const dot = Math.round(cell * DOT_RATIO);
  const ring = Math.round(cell * RING_RATIO);
  const isToday = state === 'today';
  const isFuture = state === 'future';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isToday }}
      onPress={() => onPress(dayNumber)}
      style={[styles.cell, { width: cell, height: cell }]}
    >
      {isToday ? (
        <View style={[styles.ring, { width: ring, height: ring, borderRadius: ring / 2, borderColor: colors.today }]} />
      ) : null}
      <View
        style={{
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: isToday ? colors.today : isFuture ? 'transparent' : colors.dotPast,
          borderWidth: isFuture ? 1.5 : 0,
          borderColor: colors.dotFuture,
        }}
      />
    </Pressable>
  );
}

export const DayDot = memo(DayDotBase);

const styles = StyleSheet.create({
  cell: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1.5 },
});
