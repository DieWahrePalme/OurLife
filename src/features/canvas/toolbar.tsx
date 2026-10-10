import { useState } from 'react';
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
  onAddTodo: () => void;
  onAddFocus: () => void;
  onAddMood: () => void;
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

function AddRow(props: ToolbarProps) {
  const { colors } = props;
  return (
    <View style={styles.row}>
      <ToolButton label={strings.addText} onPress={props.onAddText} colors={colors} />
      <ToolButton label={strings.addSticker} onPress={props.onAddSticker} colors={colors} />
      <ToolButton label={strings.addPhoto} onPress={props.onAddPhoto} colors={colors} />
      <ToolButton label={strings.addTodo} onPress={props.onAddTodo} colors={colors} />
      <ToolButton label={strings.addFocus} onPress={props.onAddFocus} colors={colors} />
      <ToolButton label={strings.addMood} onPress={props.onAddMood} colors={colors} />
      <ToolButton label={strings.addTape} onPress={props.onAddTape} colors={colors} />
    </View>
  );
}

function SelectionRow(props: ToolbarProps & { canRecolor: boolean }) {
  const { colors, selectedColor } = props;
  return (
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
  );
}

/**
 * The bar always has the height of its tallest state. Otherwise the page above it (which is scaled to the
 * free space) would grow and shrink whenever an item without colours, like a sticker, is selected.
 */
export function Toolbar(props: ToolbarProps) {
  const hasSelection = props.selectedColor !== null;
  const [addHeight, setAddHeight] = useState(0);
  const [selectionHeight, setSelectionHeight] = useState(0);

  return (
    <View style={[styles.bar, { borderTopColor: props.colors.line, minHeight: Math.max(addHeight, selectionHeight) + BAR_PADDING * 2 }]}>
      {hasSelection ? <SelectionRow {...props} /> : <AddRow {...props} />}
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.ghost}
      >
        <View onLayout={(e) => setAddHeight(e.nativeEvent.layout.height)}>
          <AddRow {...props} />
        </View>
        <View onLayout={(e) => setSelectionHeight(e.nativeEvent.layout.height)}>
          <SelectionRow {...props} canRecolor />
        </View>
      </View>
    </View>
  );
}

const BAR_PADDING = 10;

const styles = StyleSheet.create({
  bar: { paddingVertical: BAR_PADDING, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  ghost: { position: 'absolute', left: 12, right: 12, top: 0, opacity: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  button: { minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '600' },
  swatchHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
});
