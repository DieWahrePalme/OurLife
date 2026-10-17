import { useCallback, useEffect, useRef, useState } from 'react';

import { deletePhoto, isCloudPhoto } from './photo-cloud';
import type { CanvasItem } from './types';

export const UNDO_WINDOW_MS = 6000;

interface Deleted {
  item: CanvasItem;
  index: number;
}

interface UndoDelete {
  /** The item that can still be brought back with the bar, or null. */
  deleted: CanvasItem | null;
  deleteItem: (id: string) => void;
  undo: () => void;
}

/**
 * Deleting is instant, and the last deleted item can be brought back with a bar for a few seconds. Undo / redo of the
 * page can bring back any deleted item for as long as the page is open, so the photo files of deleted photos are only
 * removed when the page is left (and only if no item uses the file again by then).
 */
export function useUndoDelete(
  items: readonly CanvasItem[],
  remove: (id: string) => void,
  restore: (item: CanvasItem, index: number) => void,
): UndoDelete {
  const [deleted, setDeleted] = useState<Deleted | null>(null);
  const pending = useRef<Deleted | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const photoFiles = useRef<Set<string>>(new Set());
  const latestItems = useRef<readonly CanvasItem[]>(items);

  useEffect(() => {
    latestItems.current = items;
  }, [items]);

  /** The bar's time is up (or a newer delete came). */
  const finish = useCallback(() => {
    clearTimeout(timer.current);
    pending.current = null;
    setDeleted(null);
  }, []);

  const deleteItem = useCallback(
    (id: string) => {
      const index = items.findIndex((it) => it.id === id);
      if (index < 0) return;
      finish();
      const next = { item: items[index], index };
      pending.current = next;
      setDeleted(next);
      if (isCloudPhoto(next.item.content)) photoFiles.current.add(next.item.content);
      remove(id);
      timer.current = setTimeout(finish, UNDO_WINDOW_MS);
    },
    [items, remove, finish],
  );

  const undo = useCallback(() => {
    const last = pending.current;
    if (!last) return;
    finish();
    restore(last.item, last.index);
  }, [restore, finish]);

  // Leaving the page: the files of deleted photos go now, unless an item (after an undo) uses them again.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      for (const content of photoFiles.current) {
        if (!latestItems.current.some((it) => it.content === content)) deletePhoto(content);
      }
    },
    [],
  );

  return { deleted: deleted?.item ?? null, deleteItem, undo };
}
