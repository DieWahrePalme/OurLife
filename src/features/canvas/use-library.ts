import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchLibrary, type LibraryItem, type LibraryKind } from './klipy';

/** Wait for a pause in typing before asking KLIPY (the free test key allows 100 requests an hour). */
const SEARCH_DELAY_MS = 500;

interface LibraryState {
  items: readonly LibraryItem[];
  page: number;
  hasNext: boolean;
  loading: boolean;
  failed: boolean;
}

const EMPTY: LibraryState = { items: [], page: 0, hasNext: false, loading: false, failed: false };

/** First page of trending results per kind, kept while the app is open to save requests. */
const trendingCache = new Map<LibraryKind, LibraryState>();

interface Library extends LibraryState {
  loadMore: () => void;
  retry: () => void;
}

/** Trending when `query` is empty, search results otherwise. Pages load as the grid is scrolled. */
export function useLibrary(kind: LibraryKind, query: string, active: boolean): Library {
  const [state, setState] = useState<LibraryState>(EMPTY);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  const load = useCallback(
    async (page: number, previous: readonly LibraryItem[]) => {
      const request = ++latest.current;
      setState((s) => ({ ...s, loading: true, failed: false }));
      try {
        const result = await fetchLibrary(kind, query, page);
        if (request !== latest.current) return;
        const next = { items: [...previous, ...result.items], page, hasNext: result.hasNext, loading: false, failed: false };
        if (!query.trim() && page === 1) trendingCache.set(kind, next);
        setState(next);
      } catch {
        if (request === latest.current) setState((s) => ({ ...s, loading: false, failed: true }));
      }
    },
    [kind, query],
  );

  useEffect(() => {
    if (!active) return undefined;
    const cached = query.trim() ? undefined : trendingCache.get(kind);
    if (cached) {
      latest.current += 1;
      setState(cached);
      return undefined;
    }
    setState(EMPTY);
    const timer = setTimeout(() => load(1, []), query.trim() ? SEARCH_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [active, kind, query, load, attempt]);

  const loadMore = useCallback(() => {
    if (state.loading || !state.hasNext) return;
    load(state.page + 1, state.items);
  }, [load, state]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, loadMore, retry };
}
