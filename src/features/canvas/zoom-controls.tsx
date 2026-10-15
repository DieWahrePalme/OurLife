import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface ZoomControlsProps {
  colors: PaletteColors;
  /** True while the page is zoomed in: then "Fit" is offered. */
  zoomed: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const BUTTON_SIZE = 40;
const ICON_SIZE = 22;

function RoundButton({ icon, label, colors, onPress }: { icon: IconName; label: string; colors: PaletteColors; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.button, { backgroundColor: colors.page, borderColor: colors.line }]}
    >
      <Ionicons name={icon} size={ICON_SIZE} color={colors.ink} />
    </Pressable>
  );
}

/** Zoom buttons in the corner of the page, for people without a pinch (mouse) and as a quick way back to the whole page. */
export function ZoomControls({ colors, zoomed, onZoomIn, onZoomOut, onFit }: ZoomControlsProps) {
  return (
    <View pointerEvents="box-none" style={styles.column}>
      <RoundButton icon="add" label={strings.zoomIn} colors={colors} onPress={onZoomIn} />
      <RoundButton icon="remove" label={strings.zoomOut} colors={colors} onPress={onZoomOut} />
      {zoomed ? <RoundButton icon="scan-outline" label={strings.zoomFit} colors={colors} onPress={onFit} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { position: 'absolute', top: 8, right: 8, gap: 6 },
  button: { width: BUTTON_SIZE, height: BUTTON_SIZE, borderRadius: BUTTON_SIZE / 2, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', opacity: 0.92 },
});
