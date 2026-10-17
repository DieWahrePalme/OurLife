import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';
import type { HomeView } from '@/features/settings/settings-store';

interface ViewToggleProps {
  value: HomeView;
  colors: PaletteColors;
  onChange: (next: HomeView) => void;
}

const OPTIONS: readonly { view: HomeView; label: string }[] = [
  { view: 'pages', label: strings.viewPages },
  { view: 'dots', label: strings.viewDots },
];

/** "Pages | Dots": how Home shows the days. */
export function ViewToggle({ value, colors, onChange }: ViewToggleProps) {
  return (
    <View accessibilityRole="radiogroup" style={[styles.track, { backgroundColor: colors.page, borderColor: colors.line }]}>
      {OPTIONS.map((option) => {
        const selected = option.view === value;
        return (
          <Pressable
            key={option.view}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.view)}
            style={[styles.option, selected && { backgroundColor: colors.dotPast }]}
          >
            <Text style={[styles.label, { color: selected ? colors.onAccent : colors.ink }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', alignSelf: 'center', borderWidth: 1, borderRadius: 22, padding: 3 },
  option: { minHeight: 40, minWidth: 96, borderRadius: 19, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  label: { fontSize: 15, fontWeight: '700' },
});
