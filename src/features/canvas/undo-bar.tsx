import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface UndoBarProps {
  colors: PaletteColors;
  onUndo: () => void;
}

/** Small bar at the bottom of the page after a delete. */
export function UndoBar({ colors, onUndo }: UndoBarProps) {
  return (
    <View accessibilityLiveRegion="polite" style={[styles.bar, { backgroundColor: colors.ink }]}>
      <Text style={[styles.text, { color: colors.paper }]}>{strings.deleted}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={strings.undoLabel} onPress={onUndo} style={styles.button}>
        <Text style={[styles.undo, { color: colors.paper }]}>{strings.undo}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingLeft: 18, paddingRight: 4 },
  text: { fontSize: 15 },
  button: { minHeight: 44, minWidth: 64, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  undo: { fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
});
