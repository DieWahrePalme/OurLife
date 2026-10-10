import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/lib/use-theme';
import { strings } from '@/constants/strings';
import { formatAmount } from '@/features/goals/command';
import { useSettingsStore } from '@/features/settings/settings-store';
import { useGoalsStore } from '@/features/goals/goals-store';
import { ProgressBar } from '@/features/goals/progress-bar';
import { loadGoalEntries, progressFor, totalFor } from '@/features/goals/progress';
import type { GoalEntry } from '@/features/goals/types';
import { dateForDayNumber, formatDay, parseIsoDate } from '@/lib/dates';

export default function GoalDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const startDate = useSettingsStore((state) => state.startDate);
  const { goals, load, removeGoal } = useGoalsStore();
  const [entries, setEntries] = useState<GoalEntry[]>([]);

  const refresh = useCallback(async () => {
    await load();
    try {
      setEntries(await loadGoalEntries());
    } catch {
      setEntries([]);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const goal = goals.find((g) => g.id === id);
  if (!goal) return <Text style={[styles.empty, { color: colors.inkSoft }]}>{strings.goalNotFound}</Text>;

  const mine = entries.filter((e) => e.goalId === goal.id).sort((a, b) => b.dayNumber - a.dayNumber);
  const total = totalFor(goal, entries);
  const startStamp = parseIsoDate(startDate);
  const plain = (value: number) => formatAmount(value, goal.unit).replace(/^\+/, '');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: goal.name }} />
      <Text accessibilityRole="header" style={[styles.total, { color: colors.ink }]}>
        {strings.goalTotal(plain(total), plain(goal.target))}
      </Text>
      {goal.deadline ? <Text style={[styles.meta, { color: colors.inkSoft }]}>{strings.goalDeadline(goal.deadline)}</Text> : null}
      <ProgressBar progress={progressFor(goal, total)} fill={colors.dotPast} track={colors.line} label={goal.name} />
      <Text accessibilityRole="header" style={[styles.section, { color: colors.ink }]}>{strings.goalEntriesTitle}</Text>
      {mine.length === 0 ? <Text style={[styles.meta, { color: colors.inkSoft }]}>{strings.goalNoEntries}</Text> : null}
      {mine.map((entry) => (
        <Pressable
          key={entry.itemId}
          accessibilityRole="button"
          accessibilityLabel={`Day ${entry.dayNumber}, ${formatAmount(entry.amount, goal.unit)}`}
          onPress={() => router.push({ pathname: '/day/[n]', params: { n: entry.dayNumber } })}
          style={[styles.entry, { borderBottomColor: colors.line }]}
        >
          <View>
            <Text style={[styles.entryDay, { color: colors.ink }]}>Day {entry.dayNumber}</Text>
            <Text style={[styles.meta, { color: colors.inkSoft }]}>{formatDay(dateForDayNumber(startStamp, entry.dayNumber))}</Text>
          </View>
          <Text style={[styles.amount, { color: entry.amount < 0 ? '#C0463A' : '#2F9E6F' }]}>{formatAmount(entry.amount, goal.unit)}</Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          await removeGoal(goal.id);
          router.back();
        }}
        style={[styles.delete, { borderColor: colors.today }]}
      >
        <Text style={{ color: colors.today, fontSize: 15, fontWeight: '600' }}>{strings.goalDelete}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, maxWidth: 520, width: '100%', alignSelf: 'center' },
  empty: { padding: 24, textAlign: 'center', fontSize: 15 },
  total: { fontFamily: 'Caveat_700Bold', fontSize: 40, lineHeight: 54 },
  meta: { fontSize: 14 },
  section: { fontFamily: 'Caveat_700Bold', fontSize: 28, lineHeight: 38, paddingTop: 12 },
  entry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  entryDay: { fontSize: 16, fontWeight: '600' },
  amount: { fontSize: 18, fontWeight: '700' },
  delete: { minHeight: 44, borderWidth: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
});
