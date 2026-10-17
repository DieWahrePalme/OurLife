import { create } from 'zustand';

import { getSpaceId } from '@/features/sync/context';

import { loadCloudSummaries, loadLocalSummaries, type DaySummaries } from './day-summary';

interface DaySummaryState {
  summaries: DaySummaries;
  /** True once the shared copy has been read (or there is no shared space): then the summaries are complete. */
  settled: boolean;
  /** Shows the copy on this phone at once, then the shared copy when the cloud answers. */
  refresh: () => Promise<void>;
}

export const useDaySummaryStore = create<DaySummaryState>((set) => ({
  summaries: {},
  settled: false,
  refresh: async () => {
    const spaceId = getSpaceId();
    try {
      set({ summaries: await loadLocalSummaries() });
    } catch {
      // The grid still works, just without filled dots.
    }
    if (!spaceId) {
      set({ settled: true });
      return;
    }
    try {
      set({ summaries: await loadCloudSummaries(spaceId), settled: true });
    } catch {
      // Offline: the copy from this phone stays.
    }
  },
}));
