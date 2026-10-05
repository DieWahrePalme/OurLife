import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { START_DATE, Palette } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { dateForDayNumber, dayNumberFor, formatDay, parseIsoDate, todayStamp } from '@/lib/dates';

export default function DayScreen() {
  const colors = Palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { n } = useLocalSearchParams<{ n: string }>();
  const dayNumber = Number.parseInt(n ?? '', 10);

  if (!Number.isInteger(dayNumber) || dayNumber < 1) {
    return <Stack.Screen options={{ title: 'Not found' }} />;
  }

  const startStamp = parseIsoDate(START_DATE);
  const isFuture = dayNumber > dayNumberFor(startStamp, todayStamp());

  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
        {strings.dayTitle(dayNumber)}
      </Text>
      <Text style={[styles.date, { color: colors.inkSoft }]}>
        {formatDay(dateForDayNumber(startStamp, dayNumber), true)}
      </Text>
      <Text style={[styles.empty, { color: colors.ink }]}>{isFuture ? strings.futureDay : strings.emptyDay}</Text>
      {!isFuture ? <Text style={[styles.hint, { color: colors.inkSoft }]}>{strings.emptyDayHint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', paddingTop: 24, gap: 6 },
  title: { fontFamily: 'Caveat_700Bold', fontSize: 56 },
  date: { fontSize: 15, marginBottom: 32 },
  empty: { fontSize: 18 },
  hint: { fontSize: 14 },
});
