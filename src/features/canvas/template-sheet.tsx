import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { TEMPLATES, type PageTemplate } from './templates';

interface TemplateSheetProps {
  visible: boolean;
  colors: PaletteColors;
  onPick: (template: PageTemplate) => void;
  onClose: () => void;
}

/** A short list of page layouts to start from. */
export function TemplateSheet({ visible, colors, onPick, onClose }: TemplateSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={strings.close} style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.paper }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, fontFamily: colors.fontDisplay }]}>
          {strings.templatesTitle}
        </Text>
        {TEMPLATES.map((template) => (
          <Pressable
            key={template.id}
            accessibilityRole="button"
            accessibilityLabel={`${template.name}. ${template.hint}`}
            onPress={() => onPick(template)}
            style={[styles.row, { backgroundColor: colors.page, borderColor: colors.line }]}
          >
            <Text style={[styles.name, { color: colors.ink }]}>{template.name}</Text>
            <Text style={[styles.hint, { color: colors.inkSoft }]}>{template.hint}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 28, gap: 8, alignSelf: 'center', width: '100%', maxWidth: 520 },
  title: { fontSize: 30, lineHeight: 42, textAlign: 'center' },
  row: { minHeight: 64, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center', gap: 2 },
  name: { fontSize: 17, fontWeight: '700' },
  hint: { fontSize: 14 },
});
