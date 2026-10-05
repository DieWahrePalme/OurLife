import { StyleSheet, View } from 'react-native';

interface ProgressBarProps {
  progress: number;
  fill: string;
  track: string;
  label: string;
}

export function ProgressBar({ progress, fill, track, label }: ProgressBarProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[styles.track, { backgroundColor: track }]}
    >
      <View style={[styles.fill, { backgroundColor: fill, width: `${progress * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
