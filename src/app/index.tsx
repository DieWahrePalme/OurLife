import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDaySummaryStore } from '@/features/days/day-summary-store';
import { subscribeToTable } from '@/features/sync/realtime';
import { milestoneLabelFor, nextMilestone } from '@/lib/milestones';
import { useSettingsStore } from '@/features/settings/settings-store';
import { useSpaceStore } from '@/features/space/space-store';
import { DayGrid } from '@/components/day-grid';
import { useColors } from '@/lib/use-theme';
import { strings } from '@/constants/strings';
import { dayNumberFor, formatDay, parseIsoDate, todayStamp } from '@/lib/dates';

export default function HomeScreen() {
  const startDate = useSettingsStore((state) => state.startDate);
  const spaceName = useSpaceStore((state) => (state.status === 'ready' ? state.spaceName : null));
  const colors = useColors();
  const startStamp = parseIsoDate(startDate);
  const todayNumber = dayNumberFor(startStamp, todayStamp());
  const summaries = useDaySummaryStore((state) => state.summaries);
  const refreshSummaries = useDaySummaryStore((state) => state.refresh);
  const upcoming = nextMilestone(todayNumber, startStamp);

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

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.paper }]}>
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Link href="/settings" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={strings.settingsTitle} style={styles.settingsLink}>
            <Text style={[styles.goalsText, { color: colors.inkSoft }]}>{strings.settingsTitle}</Text>
          </Pressable>
        </Link>
        <Link href="/goals" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={strings.goalsTitle} style={styles.goalsLink}>
            <Text style={[styles.goalsText, { color: colors.dotPast }]}>{strings.goalsTitle}</Text>
          </Pressable>
        </Link>
        <Text accessibilityRole="header" style={[styles.number, { color: colors.ink }]}>
          {strings.dayTitle(todayNumber)}
        </Text>
        <Text style={[styles.sub, { color: colors.inkSoft }]}>
          {spaceName ? `${spaceName} · ` : ''}
          {strings.together(formatDay(startStamp))}
        </Text>
        {todayNumber >= 1 ? (
          <Text style={[styles.milestone, { color: colors.dotPast }]}>
            {milestoneLabelFor(todayNumber, startStamp) !== null ? strings.milestoneToday : strings.nextMilestone(upcoming - todayNumber, upcoming)}
          </Text>
        ) : null}
      </View>
      <DayGrid startStamp={startStamp} todayNumber={todayNumber} colors={colors} summaries={summaries} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  number: { fontFamily: 'Caveat_700Bold', fontSize: 64, lineHeight: 92, paddingHorizontal: 12, paddingBottom: 6 },
  goalsLink: { position: 'absolute', right: 8, top: 8, minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center' },
  settingsLink: { position: 'absolute', left: 8, top: 8, minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center' },
  goalsText: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 14 },
  milestone: { fontSize: 14, fontWeight: '600' },
});
