import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CanvasItem } from './types';

const keyFor = (dayNumber: number): string => `ourlife.day.${dayNumber}`;

function isCanvasItem(value: unknown): value is CanvasItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    (v.kind === 'text' || v.kind === 'sticker' || v.kind === 'tape' || v.kind === 'photo') &&
    (v.aspect === undefined || typeof v.aspect === 'number') &&
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
