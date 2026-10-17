import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SKINS, type Skin, type SkinId } from '@/constants/skins';
import type { PaletteColors } from '@/constants/theme';
import { useScheme } from '@/lib/use-theme';

interface SkinPickerProps {
  colors: PaletteColors;
  selected: SkinId;
  onSelect: (id: SkinId) => void;
}

const DOT = 14;
const PREVIEW_DOTS = ['past', 'past', 'today', 'future', 'future'] as const;

/** A small sample of a skin: its book (cover and label with the title font) over its backdrop, and a few day dots. */
function SkinPreview({ skin, scheme }: { skin: Skin; scheme: 'light' | 'dark' }) {
  const p = skin.palettes[scheme];
  const cover = skin.edition.cover;
  return (
    <View style={[styles.preview, { backgroundColor: p.paper, borderColor: p.line }]}>
      <View style={[styles.book, { backgroundColor: cover.base }]}>
        <View style={[styles.bookSpine, { backgroundColor: cover.spine }]} />
        <View style={[styles.bookLabel, cover.foil ? { borderColor: cover.foil, borderWidth: 1 } : { backgroundColor: cover.label }]}>
          <Text style={[styles.previewTitle, { color: cover.labelInk, fontFamily: p.fontDisplay }]}>Day 12</Text>
        </View>
      </View>
      <View style={styles.dots}>
        {PREVIEW_DOTS.map((state, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              state === 'past' && { backgroundColor: p.dotPast },
              state === 'today' && { backgroundColor: p.today },
              state === 'future' && { borderWidth: 1.5, borderColor: p.dotFuture },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function SkinPicker({ colors, selected, onSelect }: SkinPickerProps) {
  const scheme = useScheme();
  return (
    <View accessibilityRole="radiogroup" style={styles.list}>
      {SKINS.map((skin) => {
        const isSelected = skin.id === selected;
        return (
          <Pressable
            key={skin.id}
            accessibilityRole="radio"
            accessibilityLabel={`${skin.name}. ${skin.blurb}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(skin.id)}
            style={[styles.card, { backgroundColor: colors.page, borderColor: isSelected ? colors.dotPast : colors.line, borderWidth: isSelected ? 2 : 1 }]}
          >
            <SkinPreview skin={skin} scheme={scheme} />
            <View style={styles.texts}>
              <Text style={[styles.name, { color: colors.ink }]}>{skin.name}</Text>
              <Text style={[styles.blurb, { color: colors.inkSoft }]}>{skin.blurb}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 10, minHeight: 88 },
  preview: { width: 104, height: 72, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  book: { width: 84, height: 36, borderRadius: 4, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', paddingLeft: 6 },
  bookSpine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  bookLabel: { paddingHorizontal: 8, borderRadius: 3 },
  previewTitle: { fontSize: 17, lineHeight: 22 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: DOT - 4, height: DOT - 4, borderRadius: DOT },
  texts: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '700' },
  blurb: { fontSize: 14 },
});
