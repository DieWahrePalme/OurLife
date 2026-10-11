import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';

import { DayDot, type DotState } from '@/components/day-dot';
import { COLUMNS, FUTURE_WEEKS, type PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { moodFor } from '@/features/canvas/moods';
import type { DaySummaries, DaySummary } from '@/features/days/day-summary';
import { milestoneLabelFor } from '@/lib/milestones';
import { dateForDayNumber, formatDay, formatMonthLabel } from '@/lib/dates';

const MAX_GRID_WIDTH = 480;
const GUTTER = 64;
const SIDE_PADDING = 8;

interface DayGridProps {
  startStamp: number;
  todayNumber: number;
  colors: PaletteColors;
  summaries: DaySummaries;
}

interface WeekRowProps {
  week: number;
  startStamp: number;
  todayNumber: number;
  cell: number;
  monthLabel: string | null;
  colors: PaletteColors;
  summaries: DaySummaries;
  onPressDay: (dayNumber: number) => void;
}

function detailsFor(milestone: string | null, summary: DaySummary | undefined): string[] {
  const details: string[] = [];
  if (milestone !== null) details.push(strings.dotMilestone);
  if (summary?.filled) details.push(strings.dotFilled);
  if (summary?.mood) details.push(strings.dotMood(moodFor(summary.mood).label));
  return details;
}

const WeekRow = memo(function WeekRow({ week, startStamp, todayNumber, cell, monthLabel, colors, summaries, onPressDay }: WeekRowProps) {
  const firstDay = week * COLUMNS + 1;
  const days = Array.from({ length: COLUMNS }, (_, i) => firstDay + i);
  return (
    <View style={styles.row}>
      <View style={styles.gutter}>
        {monthLabel ? <Text style={[styles.monthLabel, { color: colors.inkSoft }]}>{monthLabel}</Text> : null}
      </View>
      {days.map((n) => {
        const milestone = milestoneLabelFor(n, startStamp);
        const state: DotState = n < todayNumber ? 'past' : n === todayNumber ? 'today' : 'future';
        return (
          <DayDot
            key={n}
            dayNumber={n}
            state={state}
            cell={cell}
            colors={colors}
            summary={summaries[n]}
            milestone={milestone}
            label={strings.dotLabel(n, formatDay(dateForDayNumber(startStamp, n)), detailsFor(milestone, summaries[n]))}
            onPress={onPressDay}
          />
        );
      })}
    </View>
  );
});

type TodayDirection = 'up' | 'down' | null;

export function DayGrid({ startStamp, todayNumber, colors, summaries }: DayGridProps) {
  const router = useRouter();
  const listRef = useRef<FlatList<number>>(null);
  const [away, setAway] = useState<TodayDirection>(null);
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

  const todayWeekTop = todayWeek * cell;
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      const top = contentOffset.y;
      const bottom = top + layoutMeasurement.height;
      setAway(todayWeekTop + cell < top ? 'up' : todayWeekTop > bottom ? 'down' : null);
    },
    [todayWeekTop, cell],
  );
  const backToToday = useCallback(
    () => listRef.current?.scrollToIndex({ index: todayWeek, viewPosition: 0.5, animated: true }),
    [todayWeek],
  );

  return (
    <View style={styles.wrap}>
    <FlatList
      ref={listRef}
      onScroll={onScroll}
      scrollEventThrottle={100}
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
          summaries={summaries}
          onPressDay={onPressDay}
        />
      )}
    />
      {away ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.backToTodayLabel}
          onPress={backToToday}
          style={[styles.todayButton, { backgroundColor: colors.page, borderColor: colors.today }]}
        >
          <Text style={[styles.todayText, { color: colors.ink }]}>
            {away === 'up' ? '↓' : '↑'} {strings.backToToday}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  todayButton: { position: 'absolute', bottom: 24, alignSelf: 'center', minHeight: 44, paddingHorizontal: 20, borderRadius: 22, borderWidth: 1.5, justifyContent: 'center' },
  todayText: { fontSize: 15, fontWeight: '700' },
  content: { alignSelf: 'center', paddingHorizontal: SIDE_PADDING, paddingBottom: 48 },
  row: { flexDirection: 'row', alignItems: 'center' },
  gutter: { width: GUTTER - SIDE_PADDING, paddingRight: 8 },
  monthLabel: { fontSize: 12, fontWeight: '600' },
});
