import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { isGoalCommand } from '@/features/goals/command';

interface TextModalProps {
  visible: boolean;
  initialText: string;
  placeholder: string;
  colors: PaletteColors;
  /** Goal names offered while typing a /goal command. */
  goalNames: readonly string[];
  /** Returns an error message to show, or null when saved. */
  onSave: (text: string) => string | null;
  onCancel: () => void;
}

export function TextModal({ visible, initialText, placeholder, colors, goalNames, onSave, onCancel }: TextModalProps) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);

  const canSave = text.trim().length > 0;

  const suggestions = useMemo(() => {
    if (!isGoalCommand(text)) return [];
    const typed = text.trim().replace(/^\/goal\s*/i, '');
    if (/\d/.test(typed)) return [];
    return goalNames.filter((name) => name.toLowerCase().includes(typed.trim().toLowerCase()));
  }, [text, goalNames]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.paper }]}>
          <TextInput
            autoFocus
            multiline
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.inkSoft}
            style={[styles.input, { color: colors.ink, borderColor: colors.line }]}
            accessibilityLabel={placeholder}
          />
          {suggestions.length > 0 ? (
            <View style={styles.suggestions}>
              {suggestions.map((name) => (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityLabel={strings.goalSuggestionLabel(name)}
                  onPress={() => setText(`/goal ${name} `)}
                  style={[styles.chip, { borderColor: colors.dotPast }]}
                >
                  <Text style={[styles.chipText, { color: colors.dotPast }]}>{name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {error ? (
            <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.today }]}>
              {error}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.button}>
              <Text style={[styles.buttonText, { color: colors.inkSoft }]}>{strings.textCancel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              disabled={!canSave}
              onPress={() => setError(onSave(text.trim()))}
              style={[styles.button, { backgroundColor: colors.dotPast, opacity: canSave ? 1 : 0.4 }]}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>{strings.textSave}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', paddingTop: 120, paddingHorizontal: 20 },
  card: { borderRadius: 16, padding: 16, gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' },
  input: { minHeight: 96, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 18, textAlignVertical: 'top' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, justifyContent: 'center' },
  chipText: { fontSize: 15, fontWeight: '600' },
  error: { fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  button: { minHeight: 44, minWidth: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
