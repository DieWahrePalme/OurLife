import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/lib/use-theme';
import { strings } from '@/constants/strings';
import { useSettingsStore } from '@/features/settings/settings-store';
import { DayCanvas } from '@/features/canvas/day-canvas';
import { dateForDayNumber, dayNumberFor, formatDay, parseIsoDate, todayStamp } from '@/lib/dates';

interface DayArrowProps {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  disabled: boolean;
  color: string;
  onPress: () => void;
}

function DayArrow({ icon, label, disabled, color, onPress }: DayArrowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.arrow, { opacity: disabled ? 0.25 : 1 }]}
    >
      <Ionicons name={icon} size={28} color={color} />
    </Pressable>
  );
}

export default function DayScreen() {
  const startDate = useSettingsStore((state) => state.startDate);
  const colors = useColors();
  const router = useRouter();
  const { n } = useLocalSearchParams<{ n: string }>();
  const dayNumber = Number.parseInt(n ?? '', 10);

  if (!Number.isInteger(dayNumber) || dayNumber < 1) {
    return <Stack.Screen options={{ title: 'Not found' }} />;
  }

  const startStamp = parseIsoDate(startDate);
  const todayNumber = dayNumberFor(startStamp, todayStamp());
  // "replace" keeps one page on the stack, so Back always returns to the grid.
  const goTo = (target: number) => router.replace({ pathname: '/day/[n]', params: { n: target } });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <DayArrow icon="chevron-back" label={strings.previousDay} disabled={dayNumber <= 1} color={colors.ink} onPress={() => goTo(dayNumber - 1)} />
        <View style={styles.titles}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
            {strings.dayTitle(dayNumber)}
          </Text>
          <Text style={[styles.date, { color: colors.inkSoft }]}>
            {formatDay(dateForDayNumber(startStamp, dayNumber), true)}
          </Text>
        </View>
        <DayArrow icon="chevron-forward" label={strings.nextDay} disabled={dayNumber >= todayNumber} color={colors.ink} onPress={() => goTo(dayNumber + 1)} />
      </View>
      <DayCanvas key={dayNumber} dayNumber={dayNumber} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 4 },
  titles: { alignItems: 'center' },
  arrow: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Caveat_700Bold', fontSize: 44, lineHeight: 64, paddingHorizontal: 12 },
  date: { fontSize: 14 },
});
