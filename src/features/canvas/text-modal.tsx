import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface TextModalProps {
  visible: boolean;
  initialText: string;
  colors: PaletteColors;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export function TextModal({ visible, initialText, colors, onSave, onCancel }: TextModalProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (visible) setText(initialText);
  }, [visible, initialText]);

  const canSave = text.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.paper }]}>
          <TextInput
            autoFocus
            multiline
            value={text}
            onChangeText={setText}
            placeholder={strings.textPlaceholder}
            placeholderTextColor={colors.inkSoft}
            style={[styles.input, { color: colors.ink, borderColor: colors.line }]}
            accessibilityLabel={strings.textPlaceholder}
          />
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.button}>
              <Text style={[styles.buttonText, { color: colors.inkSoft }]}>{strings.textCancel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              disabled={!canSave}
              onPress={() => onSave(text.trim())}
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
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  button: { minHeight: 44, minWidth: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
