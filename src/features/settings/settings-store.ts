import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { DEFAULT_START_DATE } from '@/constants/theme';
import { DEFAULT_PEN_COLOR, PEN_COLORS } from '@/features/canvas/types';
import { updateStartDateOnServer } from '@/features/space/space-api';
import { getSpaceId } from '@/features/sync/context';

const STORAGE_KEY = 'ourlife.settings';

export type Appearance = 'system' | 'light' | 'dark';
export const APPEARANCES: readonly Appearance[] = ['system', 'light', 'dark'];

interface StoredSettings {
  startDate: string;
  penColor: string;
  /** Per phone: follow the phone's light / dark setting, or always light, or always dark. */
  appearance: Appearance;
}

interface SettingsState extends StoredSettings {
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  update: (patch: Partial<StoredSettings>) => Promise<void>;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidStartDate(value: string): boolean {
  return DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value)) && Date.parse(value) <= Date.now();
}

function readSettings(raw: string | null): StoredSettings {
  const fallback: StoredSettings = { startDate: DEFAULT_START_DATE, penColor: DEFAULT_PEN_COLOR, appearance: 'system' };
  if (!raw) return fallback;
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) return fallback;
  const s = parsed as Record<string, unknown>;
  return {
    startDate: typeof s.startDate === 'string' && isValidStartDate(s.startDate) ? s.startDate : fallback.startDate,
    penColor: typeof s.penColor === 'string' && (PEN_COLORS as readonly string[]).includes(s.penColor) ? s.penColor : fallback.penColor,
    appearance: (APPEARANCES as readonly unknown[]).includes(s.appearance) ? (s.appearance as Appearance) : fallback.appearance,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  startDate: DEFAULT_START_DATE,
  penColor: DEFAULT_PEN_COLOR,
  appearance: 'system',
  loaded: false,
  error: null,
  load: async () => {
    try {
      set({ ...readSettings(await AsyncStorage.getItem(STORAGE_KEY)), loaded: true, error: null });
    } catch {
      set({ loaded: true, error: 'Could not load your settings.' });
    }
  },
  update: async (patch) => {
    set(patch);
    const { startDate, penColor, appearance } = get();
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ startDate, penColor, appearance }));
      const spaceId = getSpaceId();
      if (spaceId && patch.startDate) await updateStartDateOnServer(spaceId, patch.startDate);
    } catch {
      set({ error: 'Could not save your settings.' });
    }
  },
}));
