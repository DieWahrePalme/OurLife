import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getSpaceId } from '@/features/sync/context';
import { subscribeToTable } from '@/features/sync/realtime';
import { stableJson } from '@/features/sync/stable-json';

import { EMPTY_SNAPSHOT, fetchDay, pushDay, type DaySnapshot } from './day-cloud';
import { baseOf, loadBase, mergeDay, saveBase, type DayBase } from './day-merge';
import { loadDay, saveDay } from './storage';
import type { CanvasItem } from './types';
import { useSeenStore } from '@/features/days/seen-store';
import { applyEntry, coalesce, HISTORY_LIMIT, type Entry } from './history';

const SAVE_DELAY_MS = 400;
const REFETCH_DELAY_MS = 250;
const RETRY_DELAY_MS = 15_000;
const OFFLINE_MESSAGE = 'No connection: showing the copy saved on this phone.';

interface DayItems {
  items: readonly CanvasItem[];
  /** False until the page loaded, and stays false if loading failed (so nothing gets overwritten). */
  canEdit: boolean;
  /** True once the copy saved on this phone is shown (before the shared copy has been fetched). */
  localReady: boolean;
  error: string | null;
  add: (item: CanvasItem) => void;
  /** Adds or removes an item without a step of undo (a drawing that is still being drawn). */
  addSilently: (item: CanvasItem) => void;
  removeSilently: (id: string) => void;
  /** Adds several items as one step of undo (a template). */
  addMany: (items: readonly CanvasItem[]) => void;
  update: (id: string, patch: Partial<CanvasItem>) => void;
  /** Changes an item without adding a step to undo (the app itself swaps a local photo for its cloud copy). */
  updateSilently: (id: string, patch: Partial<CanvasItem>) => void;
  remove: (id: string) => void;
  /** Puts a removed item back at its old place in the stacking order. */
  restore: (item: CanvasItem, index: number) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useDayItems(dayNumber: number): DayItems {
  const [items, setItems] = useState<readonly CanvasItem[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [localReady, setLocalReady] = useState(false);
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
      if (stableJson(merged) !== stableJson(local)) {
        latestItems.current = merged;
        setItems(merged);
      }
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new page is not editable until it has loaded
    setCanEdit(false);
    (async () => {
      const [stored, storedBase] = await Promise.all([loadDay(dayNumber), loadBase(dayNumber).catch(() => null)]);
      if (cancelled) return;
      setItems(stored);
      setLocalReady(true);
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

  const past = useRef<Entry[]>([]);
  const future = useRef<Entry[]>([]);
  const [steps, setSteps] = useState({ undo: 0, redo: 0 });
  const syncSteps = () => setSteps({ undo: past.current.length, redo: future.current.length });

  /** Runs a change on the newest items right away (so quick changes in a row see each other). */
  const change = useCallback((make: (prev: readonly CanvasItem[]) => readonly CanvasItem[]) => {
    const next = make(latestItems.current);
    if (next === latestItems.current) return;
    latestItems.current = next;
    setItems(next);
  }, []);

  const record = useCallback((entry: Entry) => {
    past.current = [...coalesce(past.current, entry, Date.now())].slice(-HISTORY_LIMIT);
    future.current = [];
    setSteps({ undo: past.current.length, redo: 0 });
  }, []);

  const add = useCallback(
    (item: CanvasItem) => {
      useSeenStore.getState().markMine(item.id);
      record({ kind: 'item', id: item.id, before: null, after: item, index: latestItems.current.length, at: 0 });
      change((prev) => [...prev, item]);
    },
    [change, record],
  );
  const addSilently = useCallback(
    (item: CanvasItem) => {
      useSeenStore.getState().markMine(item.id);
      change((prev) => [...prev, item]);
    },
    [change],
  );
  const removeSilently = useCallback((id: string) => change((prev) => prev.filter((it) => it.id !== id)), [change]);
  const addMany = useCallback(
    (added: readonly CanvasItem[]) => {
      const group = Date.now();
      const base = latestItems.current.length;
      added.forEach((item, index) => {
        useSeenStore.getState().markMine(item.id);
        const entry: Entry = { kind: 'item', id: item.id, before: null, after: item, index: base + index, at: group, group };
        past.current = [...past.current, entry].slice(-HISTORY_LIMIT);
      });
      future.current = [];
      setSteps({ undo: past.current.length, redo: 0 });
      change((prev) => [...prev, ...added]);
    },
    [change],
  );
  const updateSilently = useCallback(
    (id: string, patch: Partial<CanvasItem>) => change((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it))),
    [change],
  );
  const update = useCallback(
    (id: string, patch: Partial<CanvasItem>) => {
      const before = latestItems.current.find((it) => it.id === id);
      if (!before) return;
      const after = { ...before, ...patch };
      if (stableJson(before) === stableJson(after)) return;
      record({ kind: 'item', id, before, after, index: latestItems.current.indexOf(before), at: 0 });
      change((prev) => prev.map((it) => (it.id === id ? after : it)));
    },
    [change, record],
  );
  const remove = useCallback(
    (id: string) => {
      const before = latestItems.current.find((it) => it.id === id);
      if (!before) return;
      record({ kind: 'item', id, before, after: null, index: latestItems.current.indexOf(before), at: 0 });
      change((prev) => prev.filter((it) => it.id !== id));
    },
    [change, record],
  );
  const restore = useCallback(
    (item: CanvasItem, index: number) => {
      if (latestItems.current.some((it) => it.id === item.id)) return;
      record({ kind: 'item', id: item.id, before: null, after: item, index, at: 0 });
      change((prev) => [...prev.slice(0, index), item, ...prev.slice(index)]);
    },
    [change, record],
  );
  const move = useCallback(
    (id: string, toFront: boolean) => {
      const from = latestItems.current.findIndex((it) => it.id === id);
      if (from < 0) return;
      const to = toFront ? latestItems.current.length - 1 : 0;
      if (from === to) return;
      record({ kind: 'order', id, from, to, at: 0 });
      change((prev) => applyEntry(prev, { kind: 'order', id, from, to, at: 0 }, 'redo'));
    },
    [change, record],
  );
  const bringToFront = useCallback((id: string) => move(id, true), [move]);
  const sendToBack = useCallback((id: string) => move(id, false), [move]);

  const undo = useCallback(() => {
    const last = past.current[past.current.length - 1];
    if (!last) return;
    // Steps of one group (a template) are undone together.
    const steps = last.group ? past.current.filter((entry) => entry.group === last.group) : [last];
    past.current = past.current.slice(0, past.current.length - steps.length);
    future.current = [...future.current, ...steps];
    change((prev) => [...steps].reverse().reduce((items, entry) => applyEntry(items, entry, 'undo'), prev));
    syncSteps();
  }, [change]);
  const redo = useCallback(() => {
    const last = future.current[future.current.length - 1];
    if (!last) return;
    const steps = last.group ? future.current.filter((entry) => entry.group === last.group) : [last];
    future.current = future.current.slice(0, future.current.length - steps.length);
    past.current = [...past.current, ...[...steps].reverse()];
    change((prev) => [...steps].reverse().reduce((items, entry) => applyEntry(items, entry, 'redo'), prev));
    syncSteps();
  }, [change]);

  return { items, canEdit, localReady, error, add, addMany, addSilently, removeSilently, update, updateSilently, remove, restore, bringToFront, sendToBack, undo, redo, canUndo: steps.undo > 0, canRedo: steps.redo > 0 };
}
