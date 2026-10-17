import type { CanvasItem } from './types';

/**
 * One step of undo / redo, kept per open page. A step only concerns one item, so undoing it never touches what the
 * other phone did to other items meanwhile.
 */
export type Entry =
  | { kind: 'item'; id: string; before: CanvasItem | null; after: CanvasItem | null; index: number; at: number; group?: number }
  | { kind: 'order'; id: string; from: number; to: number; at: number; group?: number };

export const HISTORY_LIMIT = 100;
/** Changes to the same item this close together (for example a drag and a turn in one go) are one step. */
const COALESCE_MS = 700;

/** Adds a step; a change to the same item right after the last one joins that step. */
export function coalesce(past: readonly Entry[], entry: Entry, now: number): readonly Entry[] {
  const last = past[past.length - 1];
  if (!entry.group && last && last.kind === 'item' && !last.group && entry.kind === 'item' && last.id === entry.id && last.after !== null && entry.before !== null && now - last.at < COALESCE_MS) {
    return [...past.slice(0, -1), { ...last, after: entry.after, at: now }];
  }
  return [...past, { ...entry, at: now }];
}

function place(items: readonly CanvasItem[], item: CanvasItem, index: number): CanvasItem[] {
  const rest = items.filter((it) => it.id !== item.id);
  const at = Math.min(Math.max(index, 0), rest.length);
  return [...rest.slice(0, at), item, ...rest.slice(at)];
}

/** Applies a step to the items: `undo` goes back to the state before it, `redo` forward to the state after it. */
export function applyEntry(items: readonly CanvasItem[], entry: Entry, direction: 'undo' | 'redo'): readonly CanvasItem[] {
  if (entry.kind === 'order') {
    const target = items.find((it) => it.id === entry.id);
    if (!target) return items;
    return place(items, target, direction === 'undo' ? entry.from : entry.to);
  }
  const state = direction === 'undo' ? entry.before : entry.after;
  if (state === null) {
    return items.some((it) => it.id === entry.id) ? items.filter((it) => it.id !== entry.id) : items;
  }
  return items.some((it) => it.id === entry.id) ? items.map((it) => (it.id === entry.id ? state : it)) : place(items, state, entry.index);
}
