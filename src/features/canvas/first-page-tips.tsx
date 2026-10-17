import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PaletteColors } from '@/constants/theme';
import { strings } from '@/constants/strings';

interface FirstPageTipsProps {
  colors: PaletteColors;
  onDismiss: () => void;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TIPS: readonly { icon: IconName; text: string }[] = [
  { icon: 'hand-left-outline', text: strings.tipDrag },
  { icon: 'resize-outline', text: strings.tipTwoFingers },
  { icon: 'search-outline', text: strings.tipZoom },
  { icon: 'swap-horizontal-outline', text: strings.tipTurn },
];

/** Shown once, on the first page a phone opens: how to move, grow, zoom and turn. */
export function FirstPageTips({ colors, onDismiss }: FirstPageTipsProps) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View accessibilityViewIsModal={false} style={[styles.card, { backgroundColor: colors.sheet, borderColor: colors.line }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: '#2E2B3A', fontFamily: colors.fontDisplay }]}>
          {strings.tipsTitle}
        </Text>
        {TIPS.map((tip) => (
          <View key={tip.text} style={styles.row}>
            <Ionicons name={tip.icon} size={22} color="#2E2B3A" />
            <Text style={styles.text}>{tip.text}</Text>
          </View>
        ))}
        <Pressable accessibilityRole="button" onPress={onDismiss} style={[styles.button, { backgroundColor: colors.dotPast }]}>
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>{strings.tipsGotIt}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 10, alignItems: 'center', paddingHorizontal: 16 },
  card: { width: '100%', maxWidth: 340, borderWidth: 1, borderRadius: 14, padding: 14, gap: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  title: { fontSize: 26, lineHeight: 34 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1, fontSize: 15, color: '#2E2B3A' },
  button: { minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
