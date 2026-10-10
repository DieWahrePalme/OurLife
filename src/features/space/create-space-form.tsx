import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import { strings } from '@/constants/strings';
import type { PaletteColors } from '@/constants/theme';
import { NewGoalForm } from '@/features/goals/new-goal-form';
import type { Goal } from '@/features/goals/types';
import { isValidStartDate } from '@/features/settings/settings-store';

import type { NewSpaceSetup } from './space-api';

interface CreateSpaceFormProps {
  colors: PaletteColors;
  initialStartDate: string;
  busy: boolean;
  onSubmit: (setup: NewSpaceSetup, goals: readonly Goal[]) => void;
  onBack: () => void;
}

/** First phone: name the space, pick the start date, optionally add goals. */
export function CreateSpaceForm({ colors, initialStartDate, busy, onSubmit, onBack }: CreateSpaceFormProps) {
  const [spaceName, setSpaceName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [startDate, setStartDate] = useState(initialStartDate);
  const [goals, setGoals] = useState<readonly Goal[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!spaceName.trim()) return setError(strings.setupNeedsSpaceName);
    if (!memberName.trim()) return setError(strings.setupNeedsYourName);
    if (!isValidStartDate(startDate)) return setError(strings.setupStartDateInvalid);
    setError(null);
    onSubmit({ spaceName: spaceName.trim(), memberName: memberName.trim(), startDate }, goals);
  };

  const field = [styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.paper }];
  const label = [styles.label, { color: colors.ink }];

  return (
    <View style={[styles.card, { backgroundColor: colors.page, borderColor: colors.line }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{strings.setupTitle}</Text>

      <Text style={label}>{strings.setupSpaceName}</Text>
      <TextInput style={field} value={spaceName} onChangeText={setSpaceName} maxLength={60} placeholder={strings.setupSpaceNamePlaceholder} placeholderTextColor={colors.inkSoft} accessibilityLabel={strings.setupSpaceName} />

      <Text style={label}>{strings.setupYourName}</Text>
      <TextInput style={field} value={memberName} onChangeText={setMemberName} maxLength={40} placeholderTextColor={colors.inkSoft} accessibilityLabel={strings.setupYourName} />
      <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.setupYourNameHint}</Text>

      <Text style={label}>{strings.setupStartDate}</Text>
      <TextInput style={field} value={startDate} onChangeText={setStartDate} autoCapitalize="none" accessibilityLabel={strings.setupStartDate} />

      <Text accessibilityRole="header" style={label}>{strings.setupGoalsTitle}</Text>
      <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.setupGoalsHint}</Text>
      {goals.map((goal) => (
        <Pressable
          key={goal.id}
          accessibilityRole="button"
          accessibilityLabel={strings.setupGoalAdded(goal.name)}
          onPress={() => setGoals((current) => current.filter((g) => g.id !== goal.id))}
          style={[styles.goalRow, { borderColor: colors.line }]}
        >
          <Text style={{ color: colors.ink, fontSize: 15, flex: 1 }}>
            {goal.name} · {goal.target} {goal.unit}
          </Text>
          <Text style={{ color: colors.today, fontSize: 18 }}>×</Text>
        </Pressable>
      ))}
      <NewGoalForm
        colors={colors}
        existingNames={goals.map((g) => g.name)}
        onCreate={(goal) => setGoals((current) => [...current, goal])}
      />

      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.today, fontSize: 14 }}>
          {error}
        </Text>
      ) : null}
      <PillButton colors={colors} label={busy ? strings.pairBusy : strings.pairCreateButton} onPress={submit} disabled={busy} />
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
        <Text style={{ color: colors.inkSoft, fontSize: 15 }}>{strings.setupBack}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  title: { fontFamily: 'Caveat_700Bold', fontSize: 30, lineHeight: 40 },
  label: { fontSize: 15, fontWeight: '600', marginTop: 6 },
  hint: { fontSize: 13, lineHeight: 18 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  goalRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  back: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
