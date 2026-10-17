import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import type { PaletteColors } from '@/constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface RoundButtonProps {
  icon: IconName;
  label: string;
  colors: PaletteColors;
  onPress: () => void;
  disabled?: boolean;
}

const BUTTON_SIZE = 38;
const ICON_SIZE = 22;

/** A small round icon button for the strip under the page. */
export function RoundButton({ icon, label, colors, onPress, disabled = false }: RoundButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={3}
      style={[styles.button, { backgroundColor: colors.page, borderColor: colors.line, opacity: disabled ? 0.35 : 1 }]}
    >
      <Ionicons name={icon} size={ICON_SIZE} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: BUTTON_SIZE, height: BUTTON_SIZE, borderRadius: BUTTON_SIZE / 2, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
});
