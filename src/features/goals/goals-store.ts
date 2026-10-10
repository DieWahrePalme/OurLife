import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { getSpaceId } from '@/features/sync/context';

import { deleteGoal, fetchGoals, insertGoal } from './goals-cloud';
import type { Goal } from './types';

const STORAGE_KEY = 'ourlife.goals';
const PENDING_KEY = 'ourlife.goals.pending';
const NOT_SYNCED = 'Saved on this phone, will sync when you are online.';

/** Goal changes made while offline that the cloud has not seen yet. */
interface PendingGoals {
  added: readonly Goal[];
  removedIds: readonly string[];
}

const NOTHING_PENDING: PendingGoals = { added: [], removedIds: [] };

async function readPending(): Promise<PendingGoals> {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  const parsed: unknown = raw ? JSON.parse(raw) : null;
  if (typeof parsed !== 'object' || parsed === null) return NOTHING_PENDING;
  const { added, removedIds } = parsed as Record<string, unknown>;
  return {
    added: Array.isArray(added) ? added.filter(isGoal) : [],
    removedIds: Array.isArray(removedIds) ? removedIds.filter((id): id is string => typeof id === 'string') : [],
  };
}

async function writePending(pending: PendingGoals): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

/** Sends the offline changes. Safe to repeat: adding twice or deleting twice changes nothing. */
async function flushPending(spaceId: string): Promise<void> {
  const pending = await readPending();
  for (const goal of pending.added) await insertGoal(spaceId, goal);
  for (const id of pending.removedIds) await deleteGoal(spaceId, id);
  if (pending.added.length > 0 || pending.removedIds.length > 0) await writePending(NOTHING_PENDING);
}

function isGoal(value: unknown): value is Goal {
  if (typeof value !== 'object' || value === null) return false;
  const g = value as Record<string, unknown>;
  return (
    typeof g.id === 'string' &&
    typeof g.name === 'string' &&
    typeof g.target === 'number' &&
    typeof g.unit === 'string' &&
    (g.deadline === null || typeof g.deadline === 'string')
  );
}

interface GoalsState {
  goals: readonly Goal[];
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  addGoal: (goal: Goal) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
}

async function persist(goals: readonly Goal[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  loaded: false,
  error: null,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      set({ goals: Array.isArray(parsed) ? parsed.filter(isGoal) : [], loaded: true, error: null });
    } catch {
      set({ loaded: true, error: 'Could not load your goals.' });
      return;
    }
    const spaceId = getSpaceId();
    if (!spaceId) return;
    try {
      await flushPending(spaceId);
      const shared = await fetchGoals(spaceId);
      set({ goals: shared, error: null });
      await persist(shared);
    } catch {
      set({ error: 'No connection: showing the goals saved on this phone.' });
    }
  },
  addGoal: async (goal) => {
    const next = [...get().goals, goal];
    set({ goals: next });
    try {
      await persist(next);
      const spaceId = getSpaceId();
      if (!spaceId) return;
      try {
        await insertGoal(spaceId, goal);
      } catch {
        const pending = await readPending();
        await writePending({ ...pending, added: [...pending.added, goal] });
        set({ error: NOT_SYNCED });
      }
    } catch {
      set({ error: 'Could not save your goal.' });
    }
  },
  removeGoal: async (id) => {
    const next = get().goals.filter((g) => g.id !== id);
    set({ goals: next });
    try {
      await persist(next);
      const spaceId = getSpaceId();
      if (!spaceId) return;
      try {
        await deleteGoal(spaceId, id);
      } catch {
        const pending = await readPending();
        const neverSynced = pending.added.some((g) => g.id === id);
        await writePending({
          added: pending.added.filter((g) => g.id !== id),
          removedIds: neverSynced ? pending.removedIds : [...pending.removedIds, id],
        });
        set({ error: NOT_SYNCED });
      }
    } catch {
      set({ error: 'Could not delete your goal.' });
    }
  },
}));
