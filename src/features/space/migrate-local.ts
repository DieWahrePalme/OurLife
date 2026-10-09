import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_SNAPSHOT, pushDay } from '@/features/canvas/day-cloud';
import { loadAllDays } from '@/features/canvas/storage';
import { insertGoal } from '@/features/goals/goals-cloud';
import type { Goal } from '@/features/goals/types';

const GOALS_KEY = 'ourlife.goals';
const DAY_KEY_PREFIX = 'ourlife.day.';

/** First phone: copies the days and goals already on this phone into the new shared space. */
export async function uploadLocalData(spaceId: string): Promise<void> {
  const days = await loadAllDays();
  for (const day of days) {
    if (day.items.length > 0) await pushDay(spaceId, day.dayNumber, EMPTY_SNAPSHOT, day.items);
  }
  const rawGoals = await AsyncStorage.getItem(GOALS_KEY);
  const goals: unknown = rawGoals ? JSON.parse(rawGoals) : [];
  if (Array.isArray(goals)) {
    for (const goal of goals as Goal[]) await insertGoal(spaceId, goal);
  }
}

/** Second phone: its own test data must not mix with the shared space, so the local copy is dropped. */
export async function clearLocalData(): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k === GOALS_KEY || k.startsWith(DAY_KEY_PREFIX));
  if (keys.length > 0) await AsyncStorage.multiRemove(keys);
}
