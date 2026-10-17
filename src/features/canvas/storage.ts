import AsyncStorage from '@react-native-async-storage/async-storage';

import { ITEM_KINDS, TAPE_PATTERNS, TEXT_FONTS, TEXT_SIZES, type CanvasItem, type ItemKind, type TapePattern, type TextFont, type TextSize, type Task } from './types';

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return typeof t.text === 'string' && typeof t.done === 'boolean';
}

const keyFor = (dayNumber: number): string => `ourlife.day.${dayNumber}`;

export function isCanvasItem(value: unknown): value is CanvasItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    ITEM_KINDS.includes(v.kind as ItemKind) &&
    (v.tasks === undefined || (Array.isArray(v.tasks) && v.tasks.every(isTask))) &&
    (v.aspect === undefined || typeof v.aspect === 'number') &&
    (v.amount === undefined || typeof v.amount === 'number') &&
    (v.width === undefined || typeof v.width === 'number') &&
    (v.locked === undefined || typeof v.locked === 'boolean') &&
    (v.font === undefined || TEXT_FONTS.includes(v.font as TextFont)) &&
    (v.textSize === undefined || TEXT_SIZES.includes(v.textSize as TextSize)) &&
    (v.mark === undefined || typeof v.mark === 'boolean') &&
    (v.caption === undefined || typeof v.caption === 'string') &&
    (v.pattern === undefined || TAPE_PATTERNS.includes(v.pattern as TapePattern)) &&
    typeof v.x === 'number' &&
    typeof v.y === 'number' &&
    typeof v.scale === 'number' &&
    typeof v.rotation === 'number' &&
    typeof v.color === 'string' &&
    typeof v.content === 'string'
  );
}

export async function loadDay(dayNumber: number): Promise<CanvasItem[]> {
  const raw = await AsyncStorage.getItem(keyFor(dayNumber));
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter(isCanvasItem) : [];
}

export async function saveDay(dayNumber: number, items: readonly CanvasItem[]): Promise<void> {
  await AsyncStorage.setItem(keyFor(dayNumber), JSON.stringify(items));
}

const DAY_KEY_PREFIX = 'ourlife.day.';

export interface StoredDay {
  dayNumber: number;
  items: CanvasItem[];
}

/** Every saved day page, used to total up goal entries. */
export async function loadAllDays(): Promise<StoredDay[]> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(DAY_KEY_PREFIX));
  const days = await Promise.all(
    keys.map(async (key) => {
      const dayNumber = Number.parseInt(key.slice(DAY_KEY_PREFIX.length), 10);
      return { dayNumber, items: await loadDay(dayNumber) };
    }),
  );
  return days.filter((d) => Number.isInteger(d.dayNumber));
}
