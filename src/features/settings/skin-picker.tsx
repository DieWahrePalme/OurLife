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

/** A small sample of a skin: its backdrop, a title in its font and a few day dots. */
function SkinPreview({ skin, scheme }: { skin: Skin; scheme: 'light' | 'dark' }) {
  const p = skin.palettes[scheme];
  return (
    <View style={[styles.preview, { backgroundColor: p.paper, borderColor: p.line }]}>
      <Text style={[styles.previewTitle, { color: p.ink, fontFamily: p.fontDisplay }]}>Day 12</Text>
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
  preview: { width: 104, height: 68, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  previewTitle: { fontSize: 22, lineHeight: 28 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: DOT - 4, height: DOT - 4, borderRadius: DOT },
  texts: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '700' },
  blurb: { fontSize: 14 },
});
