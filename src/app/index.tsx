import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { BookCover } from '@/components/book-cover';
import { NewThingsNote } from '@/components/new-things-note';
import { DayGrid } from '@/components/day-grid';
import { PageGrid } from '@/components/page-grid';
import { ViewToggle } from '@/components/view-toggle';
import { useDaySummaryStore } from '@/features/days/day-summary-store';
import { newThingsOf, useSeenStore } from '@/features/days/seen-store';
import { subscribeToTable } from '@/features/sync/realtime';
import { milestoneLabelFor, nextMilestone } from '@/lib/milestones';
import { useSettingsStore } from '@/features/settings/settings-store';
import { useSpaceStore } from '@/features/space/space-store';
import { useColors, useSkin } from '@/lib/use-theme';
import { strings } from '@/constants/strings';
import { dayNumberFor, formatDay, parseIsoDate, todayStamp } from '@/lib/dates';


export default function HomeScreen() {
  const startDate = useSettingsStore((state) => state.startDate);
  const homeView = useSettingsStore((state) => state.homeView);
  const updateSettings = useSettingsStore((state) => state.update);
  const spaceName = useSpaceStore((state) => (state.status === 'ready' ? state.spaceName : null));
  const colors = useColors();
  const skin = useSkin();
  const startStamp = parseIsoDate(startDate);
  const todayNumber = dayNumberFor(startStamp, todayStamp());
  const summaries = useDaySummaryStore((state) => state.summaries);
  const refreshSummaries = useDaySummaryStore((state) => state.refresh);
  const upcoming = nextMilestone(todayNumber, startStamp);
  const router = useRouter();

  // What the other phone added since this phone last looked at a day. The first start only sets the starting point.
  const settled = useDaySummaryStore((state) => state.settled);
  const { seen, mine, loaded, baselineDone, setBaseline } = useSeenStore();
  useEffect(() => {
    if (loaded && settled && !baselineDone) setBaseline(summaries);
  }, [loaded, settled, baselineDone, summaries, setBaseline]);
  const fresh = useMemo(() => (baselineDone ? newThingsOf(summaries, seen, mine) : null), [baselineDone, summaries, seen, mine]);
  const newDays = useMemo<ReadonlySet<number>>(() => new Set(fresh ? fresh.byDay.keys() : []), [fresh]);

  // Filled days: when coming back from a day page, when the other phone writes, when the app wakes up.
  useFocusEffect(
    useCallback(() => {
      refreshSummaries();
    }, [refreshSummaries]),
  );
  useEffect(() => {
    const unsubscribe = subscribeToTable('day_items', refreshSummaries);
    const appState = AppState.addEventListener('change', (state) => state === 'active' && refreshSummaries());
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [refreshSummaries]);

  const noteLabel =
    todayNumber >= 1
      ? milestoneLabelFor(todayNumber, startStamp) !== null
        ? strings.milestoneToday
        : strings.nextMilestone(upcoming - todayNumber, upcoming)
      : null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Link href="/settings" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={strings.settingsTitle} style={styles.link}>
            <Text style={[styles.linkText, { color: colors.inkSoft }]}>{strings.settingsTitle}</Text>
          </Pressable>
        </Link>
        <Link href="/goals" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={strings.goalsTitle} style={styles.link}>
            <Text style={[styles.linkText, { color: colors.dotPast }]}>{strings.goalsTitle}</Text>
          </Pressable>
        </Link>
      </View>
      <View style={styles.cover}>
        <BookCover
          edition={skin.edition}
          colors={colors}
          spaceName={spaceName}
          dayLabel={strings.dayTitle(todayNumber)}
          togetherLabel={strings.together(formatDay(startStamp))}
          noteLabel={noteLabel}
        />
      </View>
      {fresh && fresh.latestDay !== null ? (
        <NewThingsNote total={fresh.total} day={fresh.latestDay} days={fresh.byDay.size} onPress={() => router.push({ pathname: '/day/[n]', params: { n: fresh.latestDay as number } })} />
      ) : null}
      <View style={styles.toggle}>
        <ViewToggle value={homeView} colors={colors} onChange={(next) => updateSettings({ homeView: next })} />
      </View>
      {homeView === 'pages' ? (
        <PageGrid startStamp={startStamp} todayNumber={todayNumber} colors={colors} summaries={summaries} newDays={newDays} />
      ) : (
        <DayGrid startStamp={startStamp} todayNumber={todayNumber} colors={colors} summaries={summaries} newDays={newDays} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  link: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center' },
  linkText: { fontSize: 16, fontWeight: '600' },
  cover: { paddingHorizontal: 16, paddingBottom: 12 },
  toggle: { paddingBottom: 8 },
});
