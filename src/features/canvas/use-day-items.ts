import { useCallback, useEffect, useRef, useState } from 'react';

import { loadDay, saveDay } from './storage';
import type { CanvasItem } from './types';

const SAVE_DELAY_MS = 400;

interface DayItems {
  items: readonly CanvasItem[];
  ready: boolean;
  error: string | null;
  add: (item: CanvasItem) => void;
  update: (id: string, patch: Partial<CanvasItem>) => void;
  remove: (id: string) => void;
  bringToFront: (id: string) => void;
}

export function useDayItems(dayNumber: number): DayItems {
  const [items, setItems] = useState<readonly CanvasItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loaded.current = false;
    setReady(false);
    loadDay(dayNumber)
      .then((stored) => {
        if (cancelled) return;
        setItems(stored);
        loaded.current = true;
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load this page.');
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [dayNumber]);

  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => {
      saveDay(dayNumber, items).catch(() => setError('Could not save your changes.'));
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dayNumber, items]);

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

  return { items, ready, error, add, update, remove, bringToFront };
}
