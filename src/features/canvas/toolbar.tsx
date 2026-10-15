import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PEN_COLORS } from './types';
import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface ToolbarProps {
  colors: PaletteColors;
  /** Colour shown as chosen when an item is selected, or null when nothing is. */
  selectedColor: string | null;
  canRecolor: boolean;
  canDuplicate: boolean;
  canEditText: boolean;
  onAddText: () => void;
  onAddSticker: () => void;
  onAddTape: () => void;
  onAddPhoto: () => void;
  onAddTodo: () => void;
  onAddFocus: () => void;
  onAddMood: () => void;
  onPickColor: (color: string) => void;
  onToFront: () => void;
  onToBack: () => void;
  onEdit: () => void;
  onLock: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICON_SIZE = 24;

/** An icon with its name below it, so every tool is recognised at a glance and still readable by name. */
function ToolButton({ label, icon, onPress, colors, danger = false }: { label: string; icon: IconName; onPress: () => void; colors: PaletteColors; danger?: boolean }) {
  const tint = danger ? colors.danger : colors.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.tool}>
      <Ionicons name={icon} size={ICON_SIZE} color={tint} />
      <Text numberOfLines={1} style={[styles.toolText, { color: tint }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function AddRow(props: ToolbarProps) {
  const { colors } = props;
  return (
    <View style={styles.row}>
      <ToolButton label={strings.addText} icon="text-outline" onPress={props.onAddText} colors={colors} />
      <ToolButton label={strings.addSticker} icon="happy-outline" onPress={props.onAddSticker} colors={colors} />
      <ToolButton label={strings.addPhoto} icon="image-outline" onPress={props.onAddPhoto} colors={colors} />
      <ToolButton label={strings.addTodo} icon="checkbox-outline" onPress={props.onAddTodo} colors={colors} />
      <ToolButton label={strings.addFocus} icon="flag-outline" onPress={props.onAddFocus} colors={colors} />
      <ToolButton label={strings.addMood} icon="heart-outline" onPress={props.onAddMood} colors={colors} />
      <ToolButton label={strings.addTape} icon="bandage-outline" onPress={props.onAddTape} colors={colors} />
    </View>
  );
}

interface SelectionRowProps extends ToolbarProps {
  picking: boolean;
  onPicking: (picking: boolean) => void;
}

function SelectionRow(props: SelectionRowProps) {
  const { colors, selectedColor } = props;
  if (props.picking) {
    return (
      <View style={styles.row}>
        {PEN_COLORS.map((color) => (
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
        ))}
        <ToolButton label={strings.doneLabel} icon="checkmark" onPress={() => props.onPicking(false)} colors={colors} />
      </View>
    );
  }
  return (
    <View style={styles.row}>
      {props.canRecolor ? <ToolButton label={strings.pickColor} icon="color-palette-outline" onPress={() => props.onPicking(true)} colors={colors} /> : null}
      {props.canEditText ? <ToolButton label={strings.editItem} icon="create-outline" onPress={props.onEdit} colors={colors} /> : null}
      <ToolButton label={strings.lockItem} icon="lock-closed-outline" onPress={props.onLock} colors={colors} />
      {props.canDuplicate ? <ToolButton label={strings.duplicateItem} icon="copy-outline" onPress={props.onDuplicate} colors={colors} /> : null}
      <ToolButton label={strings.toFront} icon="arrow-up-circle-outline" onPress={props.onToFront} colors={colors} />
      <ToolButton label={strings.toBack} icon="arrow-down-circle-outline" onPress={props.onToBack} colors={colors} />
      <ToolButton label={strings.delete} icon="trash-outline" onPress={props.onDelete} colors={colors} danger />
    </View>
  );
}

/**
 * The bar always has the height of its tallest state. Otherwise the page above it (which is scaled to the
 * free space) would grow and shrink whenever an item without colours, like a sticker, is selected.
 */
export function Toolbar(props: ToolbarProps) {
  const hasSelection = props.selectedColor !== null;
  const [picking, setPicking] = useState(false);
  const [hadSelection, setHadSelection] = useState(hasSelection);
  // The colour row is only for the item that is selected: leaving the selection closes it.
  if (hadSelection !== hasSelection) {
    setHadSelection(hasSelection);
    if (!hasSelection) setPicking(false);
  }
  const [addHeight, setAddHeight] = useState(0);
  const [selectionHeight, setSelectionHeight] = useState(0);
  // Lifts the tools above the home indicator and gives them some room from the screen edge.
  const bottomPadding = BAR_PADDING + BAR_LIFT + useSafeAreaInsets().bottom;

  return (
    <View
      style={[
        styles.bar,
        { borderTopColor: props.colors.line, paddingBottom: bottomPadding, minHeight: Math.max(addHeight, selectionHeight) + BAR_PADDING + bottomPadding },
      ]}
    >
      {hasSelection ? <SelectionRow {...props} picking={picking} onPicking={setPicking} /> : <AddRow {...props} />}
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
          <SelectionRow {...props} canRecolor canDuplicate canEditText picking={false} onPicking={setPicking} />
        </View>
      </View>
    </View>
  );
}

const BAR_PADDING = 10;
const BAR_LIFT = 12;

const styles = StyleSheet.create({
  bar: { paddingTop: BAR_PADDING, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  ghost: { position: 'absolute', left: 12, right: 12, top: 0, opacity: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 2 },
  tool: { minHeight: 56, minWidth: 48, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', gap: 2 },
  toolText: { fontSize: 11, fontWeight: '600' },
  swatchHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
});
