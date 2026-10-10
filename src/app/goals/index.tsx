import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/lib/use-theme';
import { strings } from '@/constants/strings';
import { formatAmount } from '@/features/goals/command';
import { useGoalsStore } from '@/features/goals/goals-store';
import { NewGoalForm } from '@/features/goals/new-goal-form';
import { ProgressBar } from '@/features/goals/progress-bar';
import { loadGoalEntries, progressFor, totalFor } from '@/features/goals/progress';
import type { GoalEntry } from '@/features/goals/types';

export default function GoalsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { goals, load, addGoal } = useGoalsStore();
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

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: strings.goalsTitle }} />
      {goals.length === 0 ? <Text style={[styles.empty, { color: colors.inkSoft }]}>{strings.goalsEmpty}</Text> : null}
      {goals.map((goal) => {
        const total = totalFor(goal, entries);
        const label = strings.goalTotal(formatAmount(total, goal.unit).replace(/^\+/, ''), formatAmount(goal.target, goal.unit).replace(/^\+/, ''));
        return (
          <Pressable
            key={goal.id}
            accessibilityRole="button"
            accessibilityLabel={`${goal.name}, ${label}`}
            onPress={() => router.push({ pathname: '/goals/[id]', params: { id: goal.id } })}
            style={[styles.card, { backgroundColor: colors.page, borderColor: colors.line }]}
          >
            <Text style={[styles.name, { color: colors.ink }]}>{goal.name}</Text>
            <Text style={[styles.meta, { color: colors.inkSoft }]}>{label}</Text>
            <ProgressBar progress={progressFor(goal, total)} fill={colors.dotPast} track={colors.line} label={goal.name} />
          </Pressable>
        );
      })}
      <View style={styles.formWrap}>
        <Text accessibilityRole="header" style={[styles.formTitle, { color: colors.ink }]}>{strings.newGoalTitle}</Text>
        <NewGoalForm colors={colors} existingNames={goals.map((g) => g.name)} onCreate={addGoal} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  empty: { fontSize: 15, textAlign: 'center', paddingVertical: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  name: { fontFamily: 'Caveat_700Bold', fontSize: 30, lineHeight: 40 },
  meta: { fontSize: 14 },
  formWrap: { gap: 8, paddingTop: 16 },
  formTitle: { fontFamily: 'Caveat_700Bold', fontSize: 28, lineHeight: 38 },
});
