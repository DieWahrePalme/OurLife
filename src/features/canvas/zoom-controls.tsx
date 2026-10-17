import { StyleSheet, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { RoundButton } from './round-button';

interface ZoomControlsProps {
  colors: PaletteColors;
  /** True while the page is zoomed in: then "Fit" is offered. */
  zoomed: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

/** Zoom buttons for people without a pinch (mouse) and a quick way back to the whole page. */
export function ZoomControls({ colors, zoomed, onZoomIn, onZoomOut, onFit }: ZoomControlsProps) {
  return (
    <View style={styles.row}>
      {zoomed ? <RoundButton icon="scan-outline" label={strings.zoomFit} colors={colors} onPress={onFit} /> : null}
      <RoundButton icon="remove" label={strings.zoomOut} colors={colors} onPress={onZoomOut} />
      <RoundButton icon="add" label={strings.zoomIn} colors={colors} onPress={onZoomIn} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
});
