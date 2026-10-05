import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { MOODS } from './moods';
import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface MoodSheetProps {
  visible: boolean;
  colors: PaletteColors;
  onPick: (key: string) => void;
  onClose: () => void;
}

export function MoodSheet({ visible, colors, onPick, onClose }: MoodSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel={strings.close} style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.paper }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
          {strings.moodSheetTitle}
        </Text>
        <View style={styles.row}>
          {MOODS.map((mood) => (
            <Pressable
              key={mood.key}
              accessibilityRole="button"
              accessibilityLabel={mood.label}
              onPress={() => onPick(mood.key)}
              style={[styles.mood, { backgroundColor: mood.color }]}
            >
              <Text style={styles.face}>{mood.face}</Text>
              <Text style={styles.label}>{mood.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 28, alignSelf: 'center', width: '100%', maxWidth: 520 },
  title: { fontFamily: 'Caveat_700Bold', fontSize: 30, lineHeight: 42, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, padding: 16 },
  mood: { minHeight: 64, minWidth: 96, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  face: { fontSize: 28 },
  label: { fontSize: 14, fontWeight: '600', color: '#2E2B3A' },
});
