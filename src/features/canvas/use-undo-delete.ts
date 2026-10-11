import { useCallback, useEffect, useRef, useState } from 'react';

import { deletePhoto, isCloudPhoto } from './photo-cloud';
import type { CanvasItem } from './types';

export const UNDO_WINDOW_MS = 6000;

interface Deleted {
  item: CanvasItem;
  index: number;
}

interface UndoDelete {
  /** The item that can still be brought back, or null. */
  deleted: CanvasItem | null;
  deleteItem: (id: string) => void;
  undo: () => void;
}

/**
 * Deleting is instant, but the last deleted item can be brought back for a few seconds.
 * The photo file of a deleted photo is only removed once the time is up, so Undo gets the picture back too.
 */
export function useUndoDelete(
  items: readonly CanvasItem[],
  remove: (id: string) => void,
  restore: (item: CanvasItem, index: number) => void,
): UndoDelete {
  const [deleted, setDeleted] = useState<Deleted | null>(null);
  const pending = useRef<Deleted | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** The time is up (or a newer delete came): the photo file can go now. */
  const finish = useCallback(() => {
    clearTimeout(timer.current);
    const last = pending.current;
    pending.current = null;
    setDeleted(null);
    if (last && isCloudPhoto(last.item.content)) deletePhoto(last.item.content);
  }, []);

  const deleteItem = useCallback(
    (id: string) => {
      const index = items.findIndex((it) => it.id === id);
      if (index < 0) return;
      finish();
      const next = { item: items[index], index };
      pending.current = next;
      setDeleted(next);
      remove(id);
      timer.current = setTimeout(finish, UNDO_WINDOW_MS);
    },
    [items, remove, finish],
  );

  const undo = useCallback(() => {
    const last = pending.current;
    if (!last) return;
    clearTimeout(timer.current);
    pending.current = null;
    setDeleted(null);
    restore(last.item, last.index);
  }, [restore]);

  // Leaving the page counts as "time is up".
  useEffect(() => finish, [finish]);

  return { deleted: deleted?.item ?? null, deleteItem, undo };
}
