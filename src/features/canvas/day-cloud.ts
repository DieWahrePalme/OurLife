import { supabase } from '@/lib/supabase';
import { stableJson } from '@/features/sync/stable-json';

import { isCanvasItem } from './storage';
import type { CanvasItem } from './types';

/** id -> stable JSON of the row as the cloud has it, used to send only what changed. */
export type DaySnapshot = ReadonlyMap<string, string>;

export const EMPTY_SNAPSHOT: DaySnapshot = new Map();

export interface CloudDay {
  items: CanvasItem[];
  snapshot: DaySnapshot;
}

function client() {
  if (!supabase) throw new Error('Cloud is not configured');
  return supabase;
}

/** Items are stored with a "z" (stacking order) next to the item itself. */
function withOrder(item: CanvasItem, order: number): Record<string, unknown> {
  return { ...item, z: order };
}

function withoutOrder(data: Record<string, unknown>): unknown {
  const { z: _z, ...item } = data;
  return item;
}

export async function fetchDay(spaceId: string, dayNumber: number): Promise<CloudDay> {
  const { data, error } = await client()
    .from('day_items')
    .select('id, data')
    .eq('space_id', spaceId)
    .eq('day_number', dayNumber);
  if (error) throw error;

  const rows = (data ?? [])
    .filter((row): row is { id: string; data: Record<string, unknown> } => typeof row.data === 'object' && row.data !== null)
    .sort((a, b) => Number(a.data.z ?? 0) - Number(b.data.z ?? 0));

  const snapshot = new Map<string, string>();
  const items: CanvasItem[] = [];
  for (const row of rows) {
    const item = withoutOrder(row.data);
    if (!isCanvasItem(item) || item.id !== row.id) continue;
    items.push(item);
    snapshot.set(row.id, stableJson(row.data));
  }
  return { items, snapshot };
}

/** Sends the changes since `previous` (new and edited items, removed items). Returns the new snapshot. */
export async function pushDay(
  spaceId: string,
  dayNumber: number,
  previous: DaySnapshot,
  items: readonly CanvasItem[],
): Promise<DaySnapshot> {
  const next = new Map<string, string>();
  const changedRows: { space_id: string; id: string; day_number: number; data: Record<string, unknown>; updated_at: string }[] = [];
  const now = new Date().toISOString();

  items.forEach((item, order) => {
    const data = withOrder(item, order);
    const json = stableJson(data);
    next.set(item.id, json);
    if (previous.get(item.id) !== json) {
      changedRows.push({ space_id: spaceId, id: item.id, day_number: dayNumber, data, updated_at: now });
    }
  });
  const removedIds = [...previous.keys()].filter((id) => !next.has(id));

  if (changedRows.length > 0) {
    const { error } = await client().from('day_items').upsert(changedRows, { onConflict: 'space_id,id' });
    if (error) throw error;
  }
  if (removedIds.length > 0) {
    const { error } = await client().from('day_items').delete().eq('space_id', spaceId).in('id', removedIds);
    if (error) throw error;
  }
  return next;
}
