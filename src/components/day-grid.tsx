import { memo, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import { DayDot, type DotState } from '@/components/day-dot';
import { COLUMNS, FUTURE_WEEKS, type PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { dateForDayNumber, formatDay, formatMonthLabel } from '@/lib/dates';

const MAX_GRID_WIDTH = 480;
const GUTTER = 72;
const SIDE_PADDING = 12;

interface DayGridProps {
  startStamp: number;
  todayNumber: number;
  colors: PaletteColors;
}

interface WeekRowProps {
  week: number;
  startStamp: number;
  todayNumber: number;
  cell: number;
  monthLabel: string | null;
  colors: PaletteColors;
  onPressDay: (dayNumber: number) => void;
}

const WeekRow = memo(function WeekRow({ week, startStamp, todayNumber, cell, monthLabel, colors, onPressDay }: WeekRowProps) {
  const firstDay = week * COLUMNS + 1;
  const days = Array.from({ length: COLUMNS }, (_, i) => firstDay + i);
  return (
    <View style={styles.row}>
      <View style={styles.gutter}>
        {monthLabel ? <Text style={[styles.monthLabel, { color: colors.inkSoft }]}>{monthLabel}</Text> : null}
      </View>
      {days.map((n) => {
        const state: DotState = n < todayNumber ? 'past' : n === todayNumber ? 'today' : 'future';
        return (
          <DayDot
            key={n}
            dayNumber={n}
            state={state}
            cell={cell}
            colors={colors}
            label={strings.dotLabel(n, formatDay(dateForDayNumber(startStamp, n)))}
            onPress={onPressDay}
          />
        );
      })}
    </View>
  );
});

export function DayGrid({ startStamp, todayNumber, colors }: DayGridProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const gridWidth = Math.min(width, MAX_GRID_WIDTH);
  const cell = Math.floor((gridWidth - GUTTER - SIDE_PADDING * 2) / COLUMNS);

  const todayWeek = Math.floor((todayNumber - 1) / COLUMNS);
  const weekCount = todayWeek + 1 + FUTURE_WEEKS;
  const weeks = useMemo(() => Array.from({ length: weekCount }, (_, i) => i), [weekCount]);

  const monthLabels = useMemo(() => {
    const labels = new Map<number, string>();
    for (let week = 0; week < weekCount; week += 1) {
      const firstDay = week * COLUMNS + 1;
      for (let n = firstDay; n < firstDay + COLUMNS; n += 1) {
        const stamp = dateForDayNumber(startStamp, n);
        const date = new Date(stamp);
        if (date.getUTCDate() === 1 || week === 0) {
          const showYear = week === 0 || date.getUTCMonth() === 0;
          labels.set(week, formatMonthLabel(stamp, showYear));
          break;
        }
      }
    }
    return labels;
  }, [startStamp, weekCount]);

  const onPressDay = useCallback((n: number) => router.push({ pathname: '/day/[n]', params: { n } }), [router]);

  return (
    <FlatList
      data={weeks}
      keyExtractor={(week) => String(week)}
      getItemLayout={(_, index) => ({ length: cell, offset: cell * index, index })}
      initialScrollIndex={Math.max(todayWeek - 3, 0)}
      initialNumToRender={20}
      windowSize={9}
      contentContainerStyle={[styles.content, { width: gridWidth }]}
      renderItem={({ item }) => (
        <WeekRow
          week={item}
          startStamp={startStamp}
          todayNumber={todayNumber}
          cell={cell}
          monthLabel={monthLabels.get(item) ?? null}
          colors={colors}
          onPressDay={onPressDay}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', paddingHorizontal: SIDE_PADDING, paddingBottom: 48 },
  row: { flexDirection: 'row', alignItems: 'center' },
  gutter: { width: GUTTER - SIDE_PADDING, paddingRight: 8 },
  monthLabel: { fontSize: 12, fontWeight: '600' },
});
