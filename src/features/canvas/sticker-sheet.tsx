import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { klipyAvailable, type LibraryKind } from './klipy';
import { LibraryGrid } from './library-grid';
import { STICKER_GROUPS } from './stickers';

type Tab = 'emoji' | LibraryKind;

interface StickerSheetProps {
  visible: boolean;
  colors: PaletteColors;
  /** An emoji, or the address of a library sticker or GIF together with its width / height. */
  onPick: (content: string, aspect?: number) => void;
  onClose: () => void;
}

const TABS: readonly { key: Tab; label: string }[] = [
  { key: 'stickers', label: strings.libraryTabStickers },
  { key: 'gifs', label: strings.libraryTabGifs },
  { key: 'emoji', label: strings.libraryTabEmoji },
];

/** A layer on top of the page, not a Modal: the photo library also opens fine from here on iOS. */
export function StickerSheet({ visible, colors, onPick, onClose }: StickerSheetProps) {
  const [tab, setTab] = useState<Tab>(klipyAvailable ? 'stickers' : 'emoji');
  if (!visible) return null;
  const tabs = klipyAvailable ? TABS : TABS.filter((t) => t.key === 'emoji');

  return (
    <View style={styles.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel={strings.close} style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.paper }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
          {strings.stickerSheetTitle}
        </Text>
        {tabs.length > 1 ? (
          <View style={styles.tabs} accessibilityRole="tablist">
            {tabs.map((t) => (
              <Pressable
                key={t.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: t.key === tab }}
                onPress={() => setTab(t.key)}
                style={[styles.tab, { backgroundColor: t.key === tab ? colors.dotPast : colors.page, borderColor: colors.line }]}
              >
                <Text style={{ color: t.key === tab ? '#fff' : colors.ink, fontWeight: '600' }}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {tab === 'emoji' || !klipyAvailable ? (
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
        ) : (
          <LibraryGrid kind={tab} colors={colors} onPick={onPick} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: { height: '70%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, width: '100%', maxWidth: 520 },
  title: { fontFamily: 'Caveat_700Bold', fontSize: 30, lineHeight: 42, textAlign: 'center' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 10, justifyContent: 'center' },
  tab: { minHeight: 40, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  groups: { padding: 16, gap: 14 },
  group: { gap: 6 },
  groupTitle: { fontSize: 13, fontWeight: '600' },
  glyphs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  glyphButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 32 },
});
