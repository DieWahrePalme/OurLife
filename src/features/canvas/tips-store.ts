import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'ourlife.tips';

interface TipsState {
  loaded: boolean;
  /** True once the person has read the first-page tips. */
  seen: boolean;
  load: () => Promise<void>;
  dismiss: () => void;
}

/** The little tips on the very first page are shown once per phone. */
export const useTipsStore = create<TipsState>((set) => ({
  loaded: false,
  seen: false,
  load: async () => {
    try {
      set({ seen: (await AsyncStorage.getItem(KEY)) === 'seen', loaded: true });
    } catch {
      set({ seen: true, loaded: true });
    }
  },
  dismiss: () => {
    set({ seen: true });
    AsyncStorage.setItem(KEY, 'seen').catch(() => undefined);
  },
}));
