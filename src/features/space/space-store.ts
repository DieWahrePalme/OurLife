import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { useSettingsStore } from '@/features/settings/settings-store';
import { getSpaceId, setSpaceId } from '@/features/sync/context';
import { supabase } from '@/lib/supabase';

import { deleteAllPhotos } from '@/features/canvas/photo-cloud';
import { insertGoal } from '@/features/goals/goals-cloud';
import type { Goal } from '@/features/goals/types';

import { clearLocalData, uploadLocalData } from './migrate-local';
import {
  DEFAULT_SPACE_NAME,
  createSpaceOnServer,
  ensureSession,
  fetchMySpace,
  joinSpaceOnServer,
  leaveSpaceOnServer,
  removeMemberOnServer,
  rotatePairCodeOnServer,
  updateSpaceNameOnServer,
  type NewSpaceSetup,
  type SpaceInfo,
} from './space-api';

const CACHE_KEY = 'ourlife.space';
const CODE_PATTERN = /^[0-9a-f]{24}$/;

/**
 * loading: starting up. pairing: signed in, not in a space yet. created: space just made, code on screen.
 * ready: synced. local: no Supabase keys, this phone only. error: could not reach the server.
 */
export type SpaceStatus = 'loading' | 'pairing' | 'created' | 'ready' | 'local' | 'error';

const REMOVED_MESSAGE = 'You were removed from your space. Join again with a new code.';

interface SpaceState {
  status: SpaceStatus;
  spaceName: string;
  pairCode: string | null;
  /** Shown once after creating the space (e.g. when copying the local pages failed). */
  notice: string | null;
  error: string | null;
  init: () => Promise<void>;
  createSpace: (setup: NewSpaceSetup, goals: readonly Goal[]) => Promise<void>;
  joinSpace: (code: string, memberName: string) => Promise<void>;
  confirmCreated: () => void;
  renameSpace: (name: string) => Promise<void>;
  newPairCode: () => Promise<void>;
  /** Removes a member; the server makes a new code at the same time. */
  removeMember: (userId: string) => Promise<void>;
  /** `lastPerson`: this phone is the only member, so the space (and its photo files) goes away. */
  leaveSpace: (lastPerson: boolean) => Promise<void>;
}

function readCache(raw: string | null): SpaceInfo | null {
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { id, name, startDate, pairCode } = parsed as Record<string, unknown>;
  if (typeof id !== 'string' || typeof startDate !== 'string' || typeof pairCode !== 'string') return null;
  return { id, name: typeof name === 'string' && name ? name : DEFAULT_SPACE_NAME, startDate, pairCode };
}

/** The saved copy says this phone is in a space; ask the server. Null = no longer a member, 'unreachable' = no connection. */
async function fetchFreshSpace(): Promise<SpaceInfo | null | 'unreachable'> {
  try {
    return await fetchMySpace(await ensureSession());
  } catch {
    return 'unreachable';
  }
}

async function storeNewCode(code: string): Promise<void> {
  useSpaceStore.setState({ pairCode: code });
  const cached = readCache(await AsyncStorage.getItem(CACHE_KEY));
  if (cached) await remember({ ...cached, pairCode: code });
}

async function forgetSpace(): Promise<void> {
  setSpaceId(null);
  await AsyncStorage.removeItem(CACHE_KEY);
  await clearLocalData();
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
  spaceName: DEFAULT_SPACE_NAME,
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
        set({ status: 'ready', spaceName: cached.name, pairCode: cached.pairCode });
        const fresh = await fetchFreshSpace();
        if (fresh === 'unreachable') return;
        if (!fresh) {
          // Another member removed this phone.
          await forgetSpace();
          set({ status: 'pairing', pairCode: null, error: REMOVED_MESSAGE });
          return;
        }
        adopt(fresh);
        set({ spaceName: fresh.name, pairCode: fresh.pairCode });
        await remember(fresh);
        return;
      }
      const space = await fetchMySpace(await ensureSession());
      if (space) {
        adopt(space);
        await remember(space);
        set({ status: 'ready', spaceName: space.name, pairCode: space.pairCode });
      } else {
        set({ status: 'pairing' });
      }
    } catch (error) {
      set({ status: 'error', error: messageOf(error, 'Could not reach the server. Check your internet and try again.') });
    }
  },

  createSpace: async (setup, goals) => {
    set({ error: null });
    try {
      await ensureSession();
      const space = await createSpaceOnServer(setup);
      adopt(space);
      await remember(space);
      let notice: string | null = null;
      try {
        await uploadLocalData(space.id);
        for (const goal of goals) await insertGoal(space.id, goal);
      } catch {
        notice = 'Your space is ready, but some pages or goals could not be saved. Add them again inside the app.';
      }
      set({ status: 'created', spaceName: space.name, pairCode: space.pairCode, notice });
    } catch (error) {
      set({ error: messageOf(error, 'Could not create your space.') });
    }
  },

  joinSpace: async (code, memberName) => {
    const clean = code.trim().toLowerCase();
    if (!CODE_PATTERN.test(clean)) {
      set({ error: 'That code does not look right. It has 24 letters and numbers.' });
      return;
    }
    set({ error: null });
    try {
      await ensureSession();
      const space = await joinSpaceOnServer(clean, memberName.trim());
      if (!space) {
        set({ error: 'That code did not work, or the space is full.' });
        return;
      }
      await clearLocalData();
      adopt(space);
      await remember(space);
      set({ status: 'ready', spaceName: space.name, pairCode: space.pairCode });
    } catch (error) {
      set({ error: messageOf(error, 'Could not join. Check your internet and try again.') });
    }
  },

  confirmCreated: () => set({ status: 'ready', notice: null }),

  renameSpace: async (name) => {
    const spaceId = getSpaceId();
    const clean = name.trim();
    if (!spaceId || !clean) return;
    await updateSpaceNameOnServer(spaceId, clean);
    set({ spaceName: clean });
    const cached = readCache(await AsyncStorage.getItem(CACHE_KEY));
    if (cached) await remember({ ...cached, name: clean });
  },

  newPairCode: async () => {
    await storeNewCode(await rotatePairCodeOnServer());
  },

  removeMember: async (userId) => {
    await storeNewCode(await removeMemberOnServer(userId));
  },

  leaveSpace: async (lastPerson) => {
    const spaceId = getSpaceId();
    if (lastPerson && spaceId) await deleteAllPhotos(spaceId);
    await leaveSpaceOnServer();
    await forgetSpace();
    set({ status: 'pairing', spaceName: DEFAULT_SPACE_NAME, pairCode: null, notice: null, error: null });
  },
}));
