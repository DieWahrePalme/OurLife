import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { PenSwatch } from './pen-swatch';
import { STROKE_WIDTHS, type StrokeWidthKey } from './drawing';
import { PEN_COLORS, penInk } from './types';

interface DrawBarProps {
  colors: PaletteColors;
  color: string;
  widthKey: StrokeWidthKey;
  canUndo: boolean;
  onColor: (color: string) => void;
  onWidth: (key: StrokeWidthKey) => void;
  onUndo: () => void;
  onDone: () => void;
}

const WIDTH_KEYS = Object.keys(STROKE_WIDTHS) as StrokeWidthKey[];
const WIDTH_LABEL: Readonly<Record<StrokeWidthKey, string>> = { thin: 'Thin line', medium: 'Medium line', thick: 'Thick line' };

/** The tools while drawing: pens, line width, take back the last line, and Done. It covers the normal toolbar. */
export function DrawBar({ colors, color, widthKey, canUndo, onColor, onWidth, onUndo, onDone }: DrawBarProps) {
  const bottom = useSafeAreaInsets().bottom;
  return (
    <View style={[styles.bar, { backgroundColor: colors.page, borderTopColor: colors.line, paddingBottom: 10 + bottom }]}>
      <View style={styles.row}>
        {PEN_COLORS.map((pen) => (
          <PenSwatch key={pen} color={pen} label={strings.colorLabel(pen)} selected={penInk(color) === pen} onPress={() => onColor(pen)} />
        ))}
      </View>
      <View style={styles.row}>
        {WIDTH_KEYS.map((key) => (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={WIDTH_LABEL[key]}
            accessibilityState={{ selected: widthKey === key }}
            onPress={() => onWidth(key)}
            style={[styles.width, { backgroundColor: colors.paper, borderColor: widthKey === key ? colors.dotPast : colors.line }]}
          >
            <View style={{ width: 8 + STROKE_WIDTHS[key] * 1.6, height: 8 + STROKE_WIDTHS[key] * 1.6, borderRadius: 20, backgroundColor: penInk(color) }} />
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.drawUndo}
          accessibilityState={{ disabled: !canUndo }}
          disabled={!canUndo}
          onPress={onUndo}
          style={[styles.width, { backgroundColor: colors.paper, borderColor: colors.line, opacity: canUndo ? 1 : 0.35 }]}
        >
          <Ionicons name="arrow-undo-outline" size={22} color={colors.ink} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={strings.drawDone} onPress={onDone} style={[styles.done, { backgroundColor: colors.dotPast }]}>
          <Text style={[styles.doneText, { color: colors.onAccent }]}>{strings.drawDone}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, paddingTop: 6, paddingHorizontal: 12, borderTopWidth: 1, gap: 4, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  width: { width: 48, height: 44, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  done: { minHeight: 44, minWidth: 84, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  doneText: { fontSize: 16, fontWeight: '700' },
});
