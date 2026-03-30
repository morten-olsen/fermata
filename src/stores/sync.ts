import { create } from "zustand";
import {
  syncSource,
  syncAllSources,
  type SyncProgress,
} from "../db/sync";
import type { SourceAdapter } from "../adapters/sources/types";

interface SyncState {
  isSyncing: boolean;
  progress: SyncProgress | null;
  lastError: string | null;
  lastSyncResults: Map<
    string,
    { artists: number; albums: number; tracks: number }
  >;

  /** Sync all provided source adapters */
  syncAll: (adapters: SourceAdapter[]) => Promise<void>;

  /** Sync a single source adapter */
  syncOne: (adapter: SourceAdapter) => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  progress: null,
  lastError: null,
  lastSyncResults: new Map(),

  syncAll: async (adapters) => {
    if (get().isSyncing) return;
    set({ isSyncing: true, lastError: null });

    try {
      const results = await syncAllSources(adapters, (progress) => {
        set({ progress });
      });
      set({ lastSyncResults: results, progress: null });
    } catch (error) {
      set({
        lastError:
          error instanceof Error ? error.message : "Sync failed",
      });
    } finally {
      set({ isSyncing: false });
    }
  },

  syncOne: async (adapter) => {
    if (get().isSyncing) return;
    set({ isSyncing: true, lastError: null });

    try {
      const result = await syncSource(adapter, (progress) => {
        set({ progress });
      });

      set((state) => {
        const results = new Map(state.lastSyncResults);
        results.set(adapter.id, result);
        return { lastSyncResults: results, progress: null };
      });
    } catch (error) {
      set({
        lastError:
          error instanceof Error ? error.message : "Sync failed",
      });
    } finally {
      set({ isSyncing: false });
    }
  },
}));
