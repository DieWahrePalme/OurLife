import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getSpaceId } from '@/features/sync/context';
import { subscribeToTable } from '@/features/sync/realtime';
import { stableJson } from '@/features/sync/stable-json';

import { EMPTY_SNAPSHOT, fetchDay, pushDay, type DaySnapshot } from './day-cloud';
import { baseOf, loadBase, mergeDay, saveBase, type DayBase } from './day-merge';
import { loadDay, saveDay } from './storage';
import type { CanvasItem } from './types';

const SAVE_DELAY_MS = 400;
const REFETCH_DELAY_MS = 250;
const RETRY_DELAY_MS = 15_000;
const OFFLINE_MESSAGE = 'No connection: showing the copy saved on this phone.';

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
  const synced = useRef<DaySnapshot>(EMPTY_SNAPSHOT);
  const pushChain = useRef<Promise<void>>(Promise.resolve());
  const missedRemoteChange = useRef(false);
  /** What the cloud had at the last sync. Anything on this phone that differs is a change not sent yet. */
  const base = useRef<DayBase | null>(null);
  const [needsRetry, setNeedsRetry] = useState(false);

  const rememberBase = useCallback(
    (cloudItems: readonly CanvasItem[]) => {
      const next = baseOf(cloudItems);
      base.current = next;
      saveBase(dayNumber, next).catch(() => undefined);
    },
    [dayNumber],
  );

  /** Sends local edits to the cloud, one push at a time. */
  const pushToCloud = useCallback(
    (spaceId: string, toSend: readonly CanvasItem[]): Promise<void> => {
      pushChain.current = pushChain.current
        .then(async () => {
          synced.current = await pushDay(spaceId, dayNumber, synced.current, toSend);
          rememberBase(toSend);
          setNeedsRetry(false);
          setError(null);
        })
        .catch(() => {
          setNeedsRetry(true);
          setError('Saved on this phone, will sync when you are online.');
        });
      return pushChain.current;
    },
    [dayNumber, rememberBase],
  );

  /**
   * Reads the page from the cloud and puts this phone's unsent changes on top of it.
   * Changes made offline are sent now instead of being overwritten.
   */
  const pullFromCloud = useCallback(
    async (spaceId: string): Promise<void> => {
      const remote = await fetchDay(spaceId, dayNumber);
      synced.current = remote.snapshot;
      const local = latestItems.current;
      const merged = base.current ? mergeDay(base.current, local, remote.items) : remote.items;
      rememberBase(remote.items);
      setNeedsRetry(false);
      setError(null);
      if (stableJson(merged) !== stableJson(local)) setItems(merged);
      if (stableJson(merged) !== stableJson(remote.items)) await pushToCloud(spaceId, merged);
    },
    [dayNumber, rememberBase, pushToCloud],
  );

  useEffect(() => {
    let cancelled = false;
    const spaceId = getSpaceId();
    loaded.current = false;
    synced.current = EMPTY_SNAPSHOT;
    base.current = null;
    setCanEdit(false);
    (async () => {
      const [stored, storedBase] = await Promise.all([loadDay(dayNumber), loadBase(dayNumber).catch(() => null)]);
      if (cancelled) return;
      setItems(stored);
      latestItems.current = stored;
      base.current = storedBase;
      if (spaceId) {
        // Edits wait for the cloud copy; this phone's unsent changes are merged into it, never dropped.
        try {
          await pullFromCloud(spaceId);
        } catch {
          if (cancelled) return;
          setError(OFFLINE_MESSAGE);
          setNeedsRetry(true);
          // A page first opened offline: everything on it is new to the cloud.
          if (base.current === null) {
            base.current = {};
            saveBase(dayNumber, {}).catch(() => undefined);
          }
        }
        if (cancelled) return;
      }
      loaded.current = true;
      setCanEdit(true);
    })().catch(() => {
      if (!cancelled) setError('Could not load this page.');
    });
    return () => {
      cancelled = true;
    };
  }, [dayNumber, pullFromCloud]);

  useEffect(() => {
    latestItems.current = items;
    if (!loaded.current) return;
    unsaved.current = true;
    const timer = setTimeout(() => {
      const spaceId = getSpaceId();
      saveDay(dayNumber, items)
        .then(async () => {
          if (spaceId) await pushToCloud(spaceId, items);
          unsaved.current = false;
          if (missedRemoteChange.current && spaceId) {
            missedRemoteChange.current = false;
            await pullFromCloud(spaceId).catch(() => undefined);
          }
        })
        .catch(() => setError('Could not save your changes.'));
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dayNumber, items, pushToCloud, pullFromCloud]);

  // Leaving the page within the save delay must not lose the last edits.
  useEffect(
    () => () => {
      if (!unsaved.current) return;
      saveDay(dayNumber, latestItems.current).catch(() => undefined);
      const spaceId = getSpaceId();
      if (spaceId) pushToCloud(spaceId, latestItems.current);
    },
    [dayNumber, pushToCloud],
  );

  // Offline edits: try again every few seconds until the cloud answers.
  useEffect(() => {
    const spaceId = getSpaceId();
    if (!needsRetry || !spaceId) return undefined;
    const timer = setInterval(() => pullFromCloud(spaceId).catch(() => undefined), RETRY_DELAY_MS);
    return () => clearInterval(timer);
  }, [needsRetry, pullFromCloud]);

  // Changes from the other phone arrive live; coming back to the app also refreshes the page.
  useEffect(() => {
    const spaceId = getSpaceId();
    if (!spaceId) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (!loaded.current) return;
      if (unsaved.current) {
        missedRemoteChange.current = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => pullFromCloud(spaceId).catch(() => undefined), REFETCH_DELAY_MS);
    };
    const unsubscribe = subscribeToTable('day_items', refresh);
    const appState = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => {
      clearTimeout(timer);
      unsubscribe();
      appState.remove();
    };
  }, [pullFromCloud]);

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
