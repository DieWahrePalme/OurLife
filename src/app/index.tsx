import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { DayGrid } from '@/components/day-grid';
import { START_DATE, Palette } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { dayNumberFor, formatDay, parseIsoDate, todayStamp } from '@/lib/dates';

export default function HomeScreen() {
  const colors = Palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const startStamp = parseIsoDate(START_DATE);
  const todayNumber = dayNumberFor(startStamp, todayStamp());

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.paper }]}>
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Link href="/goals" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={strings.goalsTitle} style={styles.goalsLink}>
            <Text style={[styles.goalsText, { color: colors.dotPast }]}>{strings.goalsTitle}</Text>
          </Pressable>
        </Link>
        <Text accessibilityRole="header" style={[styles.number, { color: colors.ink }]}>
          {strings.dayTitle(todayNumber)}
        </Text>
        <Text style={[styles.sub, { color: colors.inkSoft }]}>{strings.together(formatDay(startStamp))}</Text>
      </View>
      <DayGrid startStamp={startStamp} todayNumber={todayNumber} colors={colors} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  number: { fontFamily: 'Caveat_700Bold', fontSize: 64, lineHeight: 92, paddingHorizontal: 12, paddingBottom: 6 },
  goalsLink: { position: 'absolute', right: 8, top: 8, minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center' },
  goalsText: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 14 },
});
