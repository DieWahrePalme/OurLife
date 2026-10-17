import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';

interface PenSwatchProps {
  color: string;
  selected: boolean;
  label: string;
  onPress: () => void;
}

/** A pen in its colour, standing in the pencil case. The chosen one is raised and has a dot below it. */
export function PenSwatch({ color, selected, label, onPress }: PenSwatchProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={styles.hit}>
      <View style={{ transform: [{ translateY: selected ? -3 : 0 }, { rotate: '-28deg' }] }}>
        <Svg width={22} height={40} viewBox="0 0 22 40">
          <G>
            <Rect x={6} y={2} width={10} height={25} rx={3} fill={color} />
            <Rect x={6} y={8} width={10} height={3} fill="#FFFFFF" opacity={0.55} />
            <Path d="M6 27 L16 27 L11 38 Z" fill="#E9DFC8" />
            <Path d="M9 33.5 L13 33.5 L11 38 Z" fill={color} />
          </G>
        </Svg>
      </View>
      {selected ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { width: 44, height: 52, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', bottom: 3, width: 6, height: 6, borderRadius: 3 },
});
