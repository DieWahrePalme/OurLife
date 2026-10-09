import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { useSettingsStore } from '@/features/settings/settings-store';
import { setSpaceId } from '@/features/sync/context';
import { supabase } from '@/lib/supabase';

import { clearLocalData, uploadLocalData } from './migrate-local';
import { createSpaceOnServer, ensureSession, fetchMySpace, joinSpaceOnServer, type SpaceInfo } from './space-api';

const CACHE_KEY = 'ourlife.space';
const CODE_PATTERN = /^[0-9a-f]{24}$/;

/**
 * loading: starting up. pairing: signed in, not in a space yet. created: space just made, code on screen.
 * ready: synced. local: no Supabase keys, this phone only. error: could not reach the server.
 */
export type SpaceStatus = 'loading' | 'pairing' | 'created' | 'ready' | 'local' | 'error';

interface SpaceState {
  status: SpaceStatus;
  pairCode: string | null;
  /** Shown once after creating the space (e.g. when copying the local pages failed). */
  notice: string | null;
  error: string | null;
  init: () => Promise<void>;
  createSpace: (startDate: string) => Promise<void>;
  joinSpace: (code: string) => Promise<void>;
  confirmCreated: () => void;
}

function readCache(raw: string | null): SpaceInfo | null {
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { id, startDate, pairCode } = parsed as Record<string, unknown>;
  return typeof id === 'string' && typeof startDate === 'string' && typeof pairCode === 'string' ? { id, startDate, pairCode } : null;
}

async function remember(space: SpaceInfo): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(space));
}

function adopt(space: SpaceInfo): void {
  setSpaceId(space.id);
  useSettingsStore.setState({ startDate: space.startDate });
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? `${fallback} (${error.message})` : fallback;
}

export const useSpaceStore = create<SpaceState>((set) => ({
  status: 'loading',
  pairCode: null,
  notice: null,
  error: null,

  init: async () => {
    if (!supabase) {
      set({ status: 'local' });
      return;
    }
    set({ status: 'loading', error: null });
    try {
      const cached = readCache(await AsyncStorage.getItem(CACHE_KEY));
      if (cached) {
        // Open at once from the saved copy, so the app also starts without internet.
        adopt(cached);
        set({ status: 'ready', pairCode: cached.pairCode });
        const fresh = await ensureSession().then(fetchMySpace).catch(() => null);
        if (fresh) {
          adopt(fresh);
          set({ pairCode: fresh.pairCode });
          await remember(fresh);
        }
        return;
      }
      const space = await fetchMySpace(await ensureSession());
      if (space) {
        adopt(space);
        await remember(space);
        set({ status: 'ready', pairCode: space.pairCode });
      } else {
        set({ status: 'pairing' });
      }
    } catch (error) {
      set({ status: 'error', error: messageOf(error, 'Could not reach the server. Check your internet and try again.') });
    }
  },

  createSpace: async (startDate) => {
    set({ error: null });
    try {
      await ensureSession();
      const space = await createSpaceOnServer(startDate);
      adopt(space);
      await remember(space);
      let notice: string | null = null;
      try {
        await uploadLocalData(space.id);
      } catch {
        notice = 'Your space is ready, but the pages already on this phone could not be copied. Try again from Settings later.';
      }
      set({ status: 'created', pairCode: space.pairCode, notice });
    } catch (error) {
      set({ error: messageOf(error, 'Could not create your space.') });
    }
  },

  joinSpace: async (code) => {
    const clean = code.trim().toLowerCase();
    if (!CODE_PATTERN.test(clean)) {
      set({ error: 'That code does not look right. It has 24 letters and numbers.' });
      return;
    }
    set({ error: null });
    try {
      await ensureSession();
      const space = await joinSpaceOnServer(clean);
      if (!space) {
        set({ error: 'That code did not work, or your space already has two people.' });
        return;
      }
      await clearLocalData();
      adopt(space);
      await remember(space);
      set({ status: 'ready', pairCode: space.pairCode });
    } catch (error) {
      set({ error: messageOf(error, 'Could not join. Check your internet and try again.') });
    }
  },

  confirmCreated: () => set({ status: 'ready', notice: null }),
}));
