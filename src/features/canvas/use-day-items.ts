import { useCallback, useEffect, useRef, useState } from 'react';

import { loadDay, saveDay } from './storage';
import type { CanvasItem } from './types';

const SAVE_DELAY_MS = 400;

interface DayItems {
  items: readonly CanvasItem[];
  /** False until the page loaded, and stays false if loading failed (so nothing gets overwritten). */
  canEdit: boolean;
  error: string | null;
  add: (item: CanvasItem) => void;
  update: (id: string, patch: Partial<CanvasItem>) => void;
  remove: (id: string) => void;
  bringToFront: (id: string) => void;
}

export function useDayItems(dayNumber: number): DayItems {
  const [items, setItems] = useState<readonly CanvasItem[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);
  const latestItems = useRef<readonly CanvasItem[]>([]);
  const unsaved = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loaded.current = false;
    setCanEdit(false);
    loadDay(dayNumber)
      .then((stored) => {
        if (cancelled) return;
        setItems(stored);
        loaded.current = true;
        setCanEdit(true);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load this page.');
      });
    return () => {
      cancelled = true;
    };
  }, [dayNumber]);

  useEffect(() => {
    latestItems.current = items;
    if (!loaded.current) return;
    unsaved.current = true;
    const timer = setTimeout(() => {
      saveDay(dayNumber, items)
        .then(() => {
          unsaved.current = false;
          setError(null);
        })
        .catch(() => setError('Could not save your changes.'));
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dayNumber, items]);

  // Leaving the page within the save delay must not lose the last edits.
  useEffect(
    () => () => {
      if (unsaved.current) saveDay(dayNumber, latestItems.current).catch(() => undefined);
    },
    [dayNumber],
  );

  const add = useCallback((item: CanvasItem) => setItems((prev) => [...prev, item]), []);
  const update = useCallback(
    (id: string, patch: Partial<CanvasItem>) =>
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it))),
    [],
  );
  const remove = useCallback((id: string) => setItems((prev) => prev.filter((it) => it.id !== id)), []);
  const bringToFront = useCallback(
    (id: string) =>
      setItems((prev) => {
        const target = prev.find((it) => it.id === id);
        return target ? [...prev.filter((it) => it.id !== id), target] : prev;
      }),
    [],
  );

  return { items, canEdit, error, add, update, remove, bringToFront };
}
