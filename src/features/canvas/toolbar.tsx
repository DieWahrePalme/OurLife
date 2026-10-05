import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PEN_COLORS } from './types';
import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface ToolbarProps {
  colors: PaletteColors;
  /** Colour shown as chosen when an item is selected, or null when nothing is. */
  selectedColor: string | null;
  canRecolor: boolean;
  onAddText: () => void;
  onAddSticker: () => void;
  onAddTape: () => void;
  onAddPhoto: () => void;
  onPickColor: (color: string) => void;
  onToFront: () => void;
  onDelete: () => void;
}

function ToolButton({ label, onPress, colors, danger = false }: { label: string; onPress: () => void; colors: PaletteColors; danger?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.button, { borderColor: danger ? colors.today : colors.line }]}
    >
      <Text style={[styles.buttonText, { color: danger ? colors.today : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Toolbar(props: ToolbarProps) {
  const { colors, selectedColor } = props;
  const hasSelection = selectedColor !== null;

  return (
    <View style={[styles.bar, { borderTopColor: colors.line }]}>
      {hasSelection ? (
        <View style={styles.row}>
          {props.canRecolor
            ? PEN_COLORS.map((color) => (
                <Pressable
                  key={color}
                  accessibilityRole="button"
                  accessibilityLabel={strings.colorLabel(color)}
                  accessibilityState={{ selected: color === selectedColor }}
                  onPress={() => props.onPickColor(color)}
                  style={styles.swatchHit}
                >
                  <View style={[styles.swatch, { backgroundColor: color, borderColor: color === selectedColor ? colors.ink : 'transparent' }]} />
                </Pressable>
              ))
            : null}
          <ToolButton label={strings.toFront} onPress={props.onToFront} colors={colors} />
          <ToolButton label={strings.delete} onPress={props.onDelete} colors={colors} danger />
        </View>
      ) : (
        <View style={styles.row}>
          <ToolButton label={strings.addText} onPress={props.onAddText} colors={colors} />
          <ToolButton label={strings.addSticker} onPress={props.onAddSticker} colors={colors} />
          <ToolButton label={strings.addPhoto} onPress={props.onAddPhoto} colors={colors} />
          <ToolButton label={strings.addTape} onPress={props.onAddTape} colors={colors} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  button: { minHeight: 44, minWidth: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '600' },
  swatchHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
});
