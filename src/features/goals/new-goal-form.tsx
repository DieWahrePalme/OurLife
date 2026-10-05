import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import type { Goal } from './types';

interface NewGoalFormProps {
  colors: PaletteColors;
  existingNames: readonly string[];
  onCreate: (goal: Goal) => void;
}

const DEADLINE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function NewGoalForm({ colors, existingNames, onCreate }: NewGoalFormProps) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const cleanName = name.trim();
    const targetNumber = Number.parseFloat(target.replace(',', '.'));
    if (!cleanName) return setError(strings.goalNeedsName);
    if (existingNames.some((n) => n.toLowerCase() === cleanName.toLowerCase())) return setError(strings.goalNameTaken);
    if (!Number.isFinite(targetNumber) || targetNumber <= 0) return setError(strings.goalNeedsTarget);
    if (deadline && (!DEADLINE_PATTERN.test(deadline) || Number.isNaN(Date.parse(deadline)))) return setError(strings.goalBadDeadline);
    onCreate({ id: newId(), name: cleanName, target: targetNumber, unit: unit.trim(), deadline: deadline || null });
    setName('');
    setTarget('');
    setUnit('');
    setDeadline('');
    setError(null);
  };

  const field = [styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.page }];

  return (
    <View style={styles.form}>
      <TextInput style={field} value={name} onChangeText={setName} placeholder={strings.goalNamePlaceholder} placeholderTextColor={colors.inkSoft} accessibilityLabel={strings.goalNamePlaceholder} />
      <View style={styles.row}>
        <TextInput style={[field, styles.grow]} value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder={strings.goalTargetPlaceholder} placeholderTextColor={colors.inkSoft} accessibilityLabel={strings.goalTargetPlaceholder} />
        <TextInput style={[field, styles.unit]} value={unit} onChangeText={setUnit} autoCapitalize="none" placeholder={strings.goalUnitPlaceholder} placeholderTextColor={colors.inkSoft} accessibilityLabel={strings.goalUnitPlaceholder} />
      </View>
      <TextInput style={field} value={deadline} onChangeText={setDeadline} autoCapitalize="none" placeholder={strings.goalDeadlinePlaceholder} placeholderTextColor={colors.inkSoft} accessibilityLabel={strings.goalDeadlinePlaceholder} />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.today, fontSize: 14 }}>
          {error}
        </Text>
      ) : null}
      <Pressable accessibilityRole="button" onPress={submit} style={[styles.button, { backgroundColor: colors.dotPast }]}>
        <Text style={styles.buttonText}>{strings.goalCreate}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
  unit: { width: 110 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  button: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
