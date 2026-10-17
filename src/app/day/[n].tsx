/* eslint-disable react-hooks/immutability, react-hooks/preserve-manual-memoization -- the sideways positions are animated values, written with `.value =`; the compiler cannot follow them. */
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useColors } from '@/lib/use-theme';
import { titleSize } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useSettingsStore } from '@/features/settings/settings-store';
import { DayCanvas } from '@/features/canvas/day-canvas';
import { dateForDayNumber, dayNumberFor, formatDay, parseIsoDate, todayStamp } from '@/lib/dates';

const COLUMN_MAX_WIDTH = 560;
/** Turning a page. */
const TURN_MS = 260;
/** If the next page is not ready by then, it slides in anyway. */
const READY_WAIT_MS = 450;

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

function HomeButton({ color, onPress }: { color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={strings.homeLabel} onPress={onPress} style={styles.home}>
      <Ionicons name="book-outline" size={26} color={color} />
    </Pressable>
  );
}

/** Which pages are on screen: the current one, and for a moment the one that is sliding out. */
interface Stage {
  current: number;
  leaving: number | null;
  /** 1 = the new page comes from the right (going forward in time). */
  direction: 1 | -1;
  /** Which of the two sideways positions the current page uses; the page leaving uses the other one. */
  slot: 0 | 1;
}

export default function DayScreen() {
  const startDate = useSettingsStore((state) => state.startDate);
  const colors = useColors();
  const router = useRouter();
  const { n } = useLocalSearchParams<{ n: string }>();
  const target = Number.parseInt(n ?? '', 10);
  const valid = Number.isInteger(target) && target >= 1;

  const [stage, setStage] = useState<Stage>({ current: valid ? target : 1, leaving: null, direction: 1, slot: 0 });
  const [seenTarget, setSeenTarget] = useState(target);
  // The route says another day: the old page slides out, the new one comes in (set while drawing, not in an effect).
  if (valid && target !== seenTarget) {
    setSeenTarget(target);
    setStage((previous) => ({
      current: target,
      leaving: previous.current === target ? null : previous.current,
      direction: target > previous.current ? 1 : -1,
      slot: previous.current === target ? previous.slot : previous.slot === 0 ? 1 : 0,
    }));
  }

  /**
   * Two sideways positions (0 in place, +-1 one page width away). Pages take turns: the new page waits off to the side on
   * the free one before it is even drawn, so it can never flash in the middle.
   */
  const slotA = useSharedValue(0);
  const slotB = useSharedValue(0);
  const slots = [slotA, slotB] as const;
  const readyFor = useRef<number | null>(null);
  const turning = useRef<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  const finishTurn = useCallback(() => {
    turning.current = null;
    setStage((previous) => (previous.leaving === null ? previous : { ...previous, leaving: null }));
  }, []);

  const startTurn = useCallback(
    (toDay: number, direction: 1 | -1, slot: 0 | 1) => {
      if (turning.current === toDay) return;
      turning.current = toDay;
      const entering = slot === 0 ? slotA : slotB;
      const leaving = slot === 0 ? slotB : slotA;
      if (reduceMotion) {
        entering.value = 0;
        leaving.value = 0;
        finishTurn();
        return;
      }
      leaving.value = withTiming(-direction, { duration: TURN_MS, easing: Easing.out(Easing.cubic) });
      entering.value = withTiming(0, { duration: TURN_MS, easing: Easing.out(Easing.cubic) }, (done) => {
        if (done) scheduleOnRN(finishTurn);
      });
    },
    [finishTurn, slotA, slotB, reduceMotion],
  );

  // A new page waits off to the side until it has drawn itself from the copy on this phone, so no blank page slides in.
  const waitingFor = stage.leaving !== null ? stage.current : null;
  const { direction, slot } = stage;
  useEffect(() => {
    if (waitingFor === null) return undefined;
    turning.current = null;
    // Normally already there (see goTo); this covers a change of the route from outside.
    (slot === 0 ? slotA : slotB).value = direction;
    (slot === 0 ? slotB : slotA).value = 0;
    if (readyFor.current === waitingFor) {
      startTurn(waitingFor, direction, slot);
      return undefined;
    }
    const timer = setTimeout(() => startTurn(waitingFor, direction, slot), READY_WAIT_MS);
    return () => clearTimeout(timer);
  }, [waitingFor, direction, slot, slotA, slotB, startTurn]);

  const onPageReady = useCallback(
    (day: number) => {
      readyFor.current = day;
      if (waitingFor === day) startTurn(day, direction, slot);
    },
    [waitingFor, direction, slot, startTurn],
  );

  if (!valid) return <Stack.Screen options={{ title: 'Not found' }} />;

  const startStamp = parseIsoDate(startDate);
  const todayNumber = dayNumberFor(startStamp, todayStamp());
  // The route keeps one entry, so Back (or Home) always returns to the grid.
  const goTo = (day: number) => {
    if (day < 1 || day > todayNumber || stage.leaving !== null) return;
    // The new page waits beside the screen before it exists.
    slots[stage.slot === 0 ? 1 : 0].value = day > stage.current ? 1 : -1;
    router.setParams({ n: String(day) });
  };
  const swipe = (day: number) => (direction: 1 | -1) => goTo(day + direction);

  return (
    <View style={styles.screen}>
      {/* The swipe back from the left edge would fight with the page swipe; the Home button and Back are there instead. */}
      <Stack.Screen options={{ gestureEnabled: false, headerRight: () => <HomeButton color={colors.ink} onPress={() => router.navigate('/')} /> }} />
      <View style={styles.column}>
        <View style={styles.header}>
          <DayArrow icon="chevron-back" label={strings.previousDay} disabled={target <= 1} color={colors.ink} onPress={() => goTo(target - 1)} />
          <View style={styles.titles}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, fontFamily: colors.fontDisplay, fontSize: titleSize(colors, 44), lineHeight: titleSize(colors, 64) }]}>
              {strings.dayTitle(target)}
            </Text>
            <Text style={[styles.date, { color: colors.inkSoft }]}>{formatDay(dateForDayNumber(startStamp, target), true)}</Text>
          </View>
          <DayArrow icon="chevron-forward" label={strings.nextDay} disabled={target >= todayNumber} color={colors.ink} onPress={() => goTo(target + 1)} />
        </View>
        <View style={styles.pages}>
          {stage.leaving !== null ? (
            <View key={stage.leaving} pointerEvents="none" style={StyleSheet.absoluteFill}>
              <DayCanvas dayNumber={stage.leaving} isToday={stage.leaving === todayNumber} colors={colors} slide={slots[stage.slot === 0 ? 1 : 0]} onSwipe={swipe(stage.leaving)} />
            </View>
          ) : null}
          <View key={stage.current} style={StyleSheet.absoluteFill}>
            <DayCanvas
              dayNumber={stage.current}
              isToday={stage.current === todayNumber}
              colors={colors}
              slide={slots[stage.slot]}
              onReady={() => onPageReady(stage.current)}
              onSwipe={swipe(stage.current)}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  /** On a wide screen the page, the day arrows and the tools stay together in the middle. */
  column: { flex: 1, width: '100%', maxWidth: COLUMN_MAX_WIDTH, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 4 },
  pages: { flex: 1 },
  titles: { alignItems: 'center' },
  home: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Caveat_700Bold', fontSize: 44, lineHeight: 64, paddingHorizontal: 12 },
  date: { fontSize: 14 },
});
