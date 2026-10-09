import { loadAllDays } from '@/features/canvas/storage';
import { getSpaceId } from '@/features/sync/context';

import { fetchGoalEntries } from './goals-cloud';
import type { Goal, GoalEntry } from './types';

/** All entries written on any day page, for every goal. */
export async function loadGoalEntries(): Promise<GoalEntry[]> {
  const spaceId = getSpaceId();
  if (spaceId) {
    try {
      return await fetchGoalEntries(spaceId);
    } catch {
      // Offline: fall back to the copy on this phone.
    }
  }
  const days = await loadAllDays();
  return days.flatMap((day) =>
    day.items
      .filter((item) => item.kind === 'goal' && typeof item.amount === 'number')
      .map((item) => ({ itemId: item.id, goalId: item.content, dayNumber: day.dayNumber, amount: item.amount as number })),
  );
}

export function totalFor(goal: Goal, entries: readonly GoalEntry[]): number {
  return entries.filter((e) => e.goalId === goal.id).reduce((sum, e) => sum + e.amount, 0);
}

/** 0 to 1, for the progress bar. */
export function progressFor(goal: Goal, total: number): number {
  return goal.target > 0 ? Math.min(Math.max(total / goal.target, 0), 1) : 0;
}
