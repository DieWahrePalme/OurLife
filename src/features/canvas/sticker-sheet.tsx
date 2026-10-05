import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { STICKER_GROUPS } from './stickers';

interface StickerSheetProps {
  visible: boolean;
  colors: PaletteColors;
  onPick: (glyph: string) => void;
  onClose: () => void;
}

export function StickerSheet({ visible, colors, onPick, onClose }: StickerSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={strings.close} style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.paper }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
          {strings.stickerSheetTitle}
        </Text>
        <ScrollView contentContainerStyle={styles.groups}>
          {STICKER_GROUPS.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={[styles.groupTitle, { color: colors.inkSoft }]}>{group.title}</Text>
              <View style={styles.glyphs}>
                {group.glyphs.map((glyph) => (
                  <Pressable
                    key={glyph}
                    accessibilityRole="button"
                    accessibilityLabel={`${group.title} sticker ${glyph}`}
                    onPress={() => onPick(glyph)}
                    style={styles.glyphButton}
                  >
                    <Text style={styles.glyph}>{glyph}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: { maxHeight: '60%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, alignSelf: 'center', width: '100%', maxWidth: 520 },
  title: { fontFamily: 'Caveat_700Bold', fontSize: 30, lineHeight: 42, textAlign: 'center' },
  groups: { padding: 16, gap: 14 },
  group: { gap: 6 },
  groupTitle: { fontSize: 13, fontWeight: '600' },
  glyphs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  glyphButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 32 },
});
