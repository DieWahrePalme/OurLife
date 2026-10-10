import AsyncStorage from '@react-native-async-storage/async-storage';

import { stableJson } from '@/features/sync/stable-json';

import type { CanvasItem } from './types';

/** id -> stable JSON of the item, as the cloud had it the last time this phone synced the day. */
export type DayBase = Readonly<Record<string, string>>;

const keyFor = (dayNumber: number): string => `ourlife.base.${dayNumber}`;

export function baseOf(items: readonly CanvasItem[]): DayBase {
  return Object.fromEntries(items.map((item) => [item.id, stableJson(item)]));
}

function isDayBase(value: unknown): value is DayBase {
  return typeof value === 'object' && value !== null && Object.values(value).every((v) => typeof v === 'string');
}

/** Null when this phone never synced the day (older app version): the cloud copy simply wins then. */
export async function loadBase(dayNumber: number): Promise<DayBase | null> {
  const raw = await AsyncStorage.getItem(keyFor(dayNumber));
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  return isDayBase(parsed) ? parsed : null;
}

export async function saveBase(dayNumber: number, base: DayBase): Promise<void> {
  await AsyncStorage.setItem(keyFor(dayNumber), JSON.stringify(base));
}

/**
 * Puts this phone's own unsent changes on top of the newest cloud copy, item by item:
 * an item changed or added here wins, an item removed here stays removed,
 * everything else (including what the other phone did) comes from the cloud.
 */
export function mergeDay(base: DayBase, local: readonly CanvasItem[], remote: readonly CanvasItem[]): CanvasItem[] {
  const localIds = new Set(local.map((item) => item.id));
  const removedHere = new Set(Object.keys(base).filter((id) => !localIds.has(id)));
  const changedHere = new Map(local.filter((item) => base[item.id] !== stableJson(item)).map((item) => [item.id, item]));

  const remoteIds = new Set(remote.map((item) => item.id));
  const merged = remote
    .filter((item) => !removedHere.has(item.id))
    .map((item) => changedHere.get(item.id) ?? item);
  const addedHere = [...changedHere.values()].filter((item) => !remoteIds.has(item.id));
  return [...merged, ...addedHere];
}
