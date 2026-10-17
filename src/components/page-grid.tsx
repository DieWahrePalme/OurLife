import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';

import { MiniPage } from '@/components/mini-page';
import type { DotState } from '@/components/day-dot';
import { COLUMNS, FUTURE_WEEKS, type PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { moodFor } from '@/features/canvas/moods';
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/features/canvas/page-size';
import type { DaySummaries, DaySummary } from '@/features/days/day-summary';
import { milestoneLabelFor } from '@/lib/milestones';
import { dateForDayNumber, formatDay, formatMonthLabel } from '@/lib/dates';

const MAX_GRID_WIDTH = 520;
const GUTTER = 44;
const SIDE_PADDING = 8;
const ROW_GAP = 4;

interface PageGridProps {
  startStamp: number;
  todayNumber: number;
  colors: PaletteColors;
  summaries: DaySummaries;
  /** Day numbers with something new from another phone. */
  newDays: ReadonlySet<number>;
}

interface WeekRowProps {
  week: number;
  startStamp: number;
  todayNumber: number;
  cell: number;
  monthLabel: string | null;
  colors: PaletteColors;
  summaries: DaySummaries;
  newDays: ReadonlySet<number>;
  onPressDay: (dayNumber: number) => void;
}

function detailsFor(milestone: string | null, summary: DaySummary | undefined): string[] {
  const details: string[] = [];
  if (milestone !== null) details.push(strings.dotMilestone);
  if (summary?.filled) details.push(strings.dotFilled);
  if (summary?.mood) details.push(strings.dotMood(moodFor(summary.mood).label));
  return details;
}

const WeekRow = memo(function WeekRow({ week, startStamp, todayNumber, cell, monthLabel, colors, summaries, newDays, onPressDay }: WeekRowProps) {
  const firstDay = week * COLUMNS + 1;
  const days = Array.from({ length: COLUMNS }, (_, i) => firstDay + i);
  return (
    <View style={styles.row}>
      <View style={styles.gutter}>{monthLabel ? <Text style={[styles.monthLabel, { color: colors.inkSoft }]}>{monthLabel}</Text> : null}</View>
      {days.map((n) => {
        const milestone = milestoneLabelFor(n, startStamp);
        const state: DotState = n < todayNumber ? 'past' : n === todayNumber ? 'today' : 'future';
        return (
          <MiniPage
            key={n}
            dayNumber={n}
            state={state}
            width={cell}
            colors={colors}
            summary={summaries[n]}
            milestone={milestone}
            isNew={newDays.has(n)}
            label={strings.dotLabel(n, formatDay(dateForDayNumber(startStamp, n)), detailsFor(milestone, summaries[n]))}
            onPress={onPressDay}
          />
        );
      })}
    </View>
  );
});

type TodayDirection = 'up' | 'down' | null;

/** Home as a calendar of little pages: each filled day shows a tiny version of its page. */
export function PageGrid({ startStamp, todayNumber, colors, summaries, newDays }: PageGridProps) {
  const router = useRouter();
  const listRef = useRef<FlatList<number>>(null);
  const [away, setAway] = useState<TodayDirection>(null);
  const { width } = useWindowDimensions();
  const gridWidth = Math.min(width, MAX_GRID_WIDTH);
  const cell = Math.floor((gridWidth - GUTTER - SIDE_PADDING * 2) / COLUMNS);
  const rowHeight = Math.round(cell * (PAGE_HEIGHT / PAGE_WIDTH)) + ROW_GAP;

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
          labels.set(week, formatMonthLabel(stamp, week === 0 || date.getUTCMonth() === 0));
          break;
        }
      }
    }
    return labels;
  }, [startStamp, weekCount]);

  const onPressDay = useCallback((n: number) => router.push({ pathname: '/day/[n]', params: { n } }), [router]);

  const todayWeekTop = todayWeek * rowHeight;
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      const top = contentOffset.y;
      const bottom = top + layoutMeasurement.height;
      setAway(todayWeekTop + rowHeight < top ? 'up' : todayWeekTop > bottom ? 'down' : null);
    },
    [todayWeekTop, rowHeight],
  );
  const backToToday = useCallback(() => listRef.current?.scrollToIndex({ index: todayWeek, viewPosition: 0.5, animated: true }), [todayWeek]);

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        onScroll={onScroll}
        scrollEventThrottle={100}
        data={weeks}
        keyExtractor={(week) => String(week)}
        getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
        initialScrollIndex={Math.max(todayWeek - 2, 0)}
        initialNumToRender={8}
        windowSize={7}
        maxToRenderPerBatch={6}
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
            newDays={newDays}
            onPressDay={onPressDay}
          />
        )}
      />
      {away ? (
        <Pressable accessibilityRole="button" accessibilityLabel={strings.backToTodayLabel} onPress={backToToday} style={[styles.todayButton, { backgroundColor: colors.page, borderColor: colors.today }]}>
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
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: ROW_GAP / 2, paddingTop: ROW_GAP / 2 },
  gutter: { width: GUTTER - SIDE_PADDING, paddingRight: 6 },
  monthLabel: { fontSize: 11, fontWeight: '600' },
});
