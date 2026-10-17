import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface DeletedWhileEditingProps {
  /** The text that was written; null when the dialog is closed. */
  text: string | null;
  colors: PaletteColors;
  onAddAsNew: () => void;
  onDiscard: () => void;
}

/** Shown after saving an edit of an item that the other phone deleted meanwhile. The written text is never dropped silently. */
export function DeletedWhileEditing({ text, colors, onAddAsNew, onDiscard }: DeletedWhileEditingProps) {
  return (
    <Modal visible={text !== null} transparent animationType="fade" onRequestClose={onDiscard}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.paper }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
            {strings.deletedElsewhereTitle}
          </Text>
          <Text style={[styles.message, { color: colors.inkSoft }]}>{strings.deletedElsewhere}</Text>
          <Text numberOfLines={6} style={[styles.quote, { color: colors.ink, borderColor: colors.line }]}>
            {text}
          </Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onDiscard} style={styles.button}>
              <Text style={[styles.buttonText, { color: colors.inkSoft }]}>{strings.discard}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onAddAsNew} style={[styles.button, { backgroundColor: colors.dotPast }]}>
              <Text style={[styles.buttonText, { color: colors.onAccent }]}>{strings.addAsNew}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 20 },
  card: { borderRadius: 16, padding: 16, gap: 10, maxWidth: 420, width: '100%', alignSelf: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  message: { fontSize: 15 },
  quote: { fontSize: 17, borderWidth: 1, borderRadius: 10, padding: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  button: { minHeight: 44, minWidth: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
