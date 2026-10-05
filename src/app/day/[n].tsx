import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { START_DATE, Palette } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { DayCanvas } from '@/features/canvas/day-canvas';
import { dateForDayNumber, formatDay, parseIsoDate } from '@/lib/dates';

export default function DayScreen() {
  const colors = Palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { n } = useLocalSearchParams<{ n: string }>();
  const dayNumber = Number.parseInt(n ?? '', 10);

  if (!Number.isInteger(dayNumber) || dayNumber < 1) {
    return <Stack.Screen options={{ title: 'Not found' }} />;
  }

  const startStamp = parseIsoDate(START_DATE);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
          {strings.dayTitle(dayNumber)}
        </Text>
        <Text style={[styles.date, { color: colors.inkSoft }]}>
          {formatDay(dateForDayNumber(startStamp, dayNumber), true)}
        </Text>
      </View>
      <DayCanvas key={dayNumber} dayNumber={dayNumber} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', paddingBottom: 4 },
  title: { fontFamily: 'Caveat_700Bold', fontSize: 44, lineHeight: 64, paddingHorizontal: 12 },
  date: { fontSize: 14 },
});
