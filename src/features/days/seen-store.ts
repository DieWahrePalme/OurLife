import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { DaySummaries } from './day-summary';

const SEEN_KEY = 'ourlife.seen';
const MINE_KEY = 'ourlife.mine';
/** More ids than the database allows items per space; older ones are dropped. */
const MAX_REMEMBERED = 6000;

type SeenIds = Readonly<Record<string, readonly string[]>>;

interface SeenState {
  /** Per day: the ids of the items this phone has seen on that day. */
  seen: SeenIds;
  /** Ids of items made on this phone: they are never "new". */
  mine: readonly string[];
  loaded: boolean;
  /** False until the first look at the days: what is there then is the starting point, not "new". */
  baselineDone: boolean;
  load: () => Promise<void>;
  /** The person looked at these items on a day page. */
  markSeen: (dayNumber: number, ids: readonly string[]) => void;
  markMine: (id: string) => void;
  /** First start: everything that exists now counts as seen. */
  setBaseline: (summaries: DaySummaries) => void;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function readSeen(raw: string | null): { seen: SeenIds; baselineDone: boolean } {
  if (!raw) return { seen: {}, baselineDone: false };
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) return { seen: {}, baselineDone: false };
  const seen: Record<string, readonly string[]> = {};
  for (const [day, ids] of Object.entries(parsed)) if (isStringList(ids)) seen[day] = ids;
  return { seen, baselineDone: true };
}

let persistTimer: ReturnType<typeof setTimeout> | undefined;
const PERSIST_DELAY_MS = 800;

export const useSeenStore = create<SeenState>((set, get) => {
  const persist = () => {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const { seen, mine } = get();
      AsyncStorage.multiSet([
        [SEEN_KEY, JSON.stringify(seen)],
        [MINE_KEY, JSON.stringify(mine.slice(-MAX_REMEMBERED))],
      ]).catch(() => undefined);
    }, PERSIST_DELAY_MS);
  };

  return {
    seen: {},
    mine: [],
    loaded: false,
    baselineDone: false,
    load: async () => {
      try {
        const [[, rawSeen], [, rawMine]] = await AsyncStorage.multiGet([SEEN_KEY, MINE_KEY]);
        const { seen, baselineDone } = readSeen(rawSeen);
        const mine: unknown = rawMine ? JSON.parse(rawMine) : [];
        set({ seen, baselineDone, mine: isStringList(mine) ? mine : [], loaded: true });
      } catch {
        set({ loaded: true });
      }
    },
    markSeen: (dayNumber, ids) => {
      const key = String(dayNumber);
      const known = new Set(get().seen[key] ?? []);
      if (ids.every((id) => known.has(id))) return;
      set({ seen: { ...get().seen, [key]: [...new Set([...known, ...ids])] } });
      persist();
    },
    markMine: (id) => {
      if (get().mine.includes(id)) return;
      set({ mine: [...get().mine, id] });
      persist();
    },
    setBaseline: (summaries) => {
      const seen: Record<string, readonly string[]> = {};
      for (const [day, summary] of Object.entries(summaries)) seen[day] = summary.ids;
      set({ seen, baselineDone: true });
      persist();
    },
  };
});

export interface NewThings {
  /** How many new items each day has. */
  byDay: ReadonlyMap<number, number>;
  total: number;
  /** The newest day that has something new (the one the note opens). */
  latestDay: number | null;
}

/** Items on the days that this phone has not seen and did not make itself. */
export function newThingsOf(summaries: DaySummaries, seen: SeenIds, mine: readonly string[]): NewThings {
  const mineSet = new Set(mine);
  const byDay = new Map<number, number>();
  let total = 0;
  let latestDay: number | null = null;
  for (const [dayText, summary] of Object.entries(summaries)) {
    const known = new Set(seen[dayText] ?? []);
    const fresh = summary.ids.filter((id) => !known.has(id) && !mineSet.has(id)).length;
    if (fresh === 0) continue;
    const day = Number(dayText);
    byDay.set(day, fresh);
    total += fresh;
    if (latestDay === null || day > latestDay) latestDay = day;
  }
  return { byDay, total, latestDay };
}
