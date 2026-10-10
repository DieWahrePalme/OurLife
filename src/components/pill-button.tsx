import { Pressable, StyleSheet, Text } from 'react-native';

import type { PaletteColors } from '@/constants/theme';

interface PillButtonProps {
  colors: PaletteColors;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function PillButton({ colors, label, onPress, disabled = false, accessibilityLabel }: PillButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor: colors.dotPast, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  text: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
