import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

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
    }
  },
  addGoal: async (goal) => {
    const next = [...get().goals, goal];
    set({ goals: next });
    try {
      await persist(next);
    } catch {
      set({ error: 'Could not save your goal.' });
    }
  },
  removeGoal: async (id) => {
    const next = get().goals.filter((g) => g.id !== id);
    set({ goals: next });
    try {
      await persist(next);
    } catch {
      set({ error: 'Could not save your change.' });
    }
  },
}));
