import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { getSpaceId } from '@/features/sync/context';

import { deleteGoal, fetchGoals, insertGoal } from './goals-cloud';
import type { Goal } from './types';

const STORAGE_KEY = 'ourlife.goals';

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
      if (spaceId) await insertGoal(spaceId, goal);
    } catch {
      set({ error: 'Saved on this phone, but not synced yet.' });
    }
  },
  removeGoal: async (id) => {
    const next = get().goals.filter((g) => g.id !== id);
    set({ goals: next });
    try {
      await persist(next);
      const spaceId = getSpaceId();
      if (spaceId) await deleteGoal(spaceId, id);
    } catch {
      set({ error: 'Saved on this phone, but not synced yet.' });
    }
  },
}));
