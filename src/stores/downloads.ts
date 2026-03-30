import { create } from "zustand";
import {
  addPin,
  removePin,
  getPin,
  enqueueTrackDownload,
  enqueueTracksForAlbum,
  enqueueTracksForArtist,
  enqueueTracksForPlaylist,
  findOrphanedDownloads,
  getDownloadStats,
} from "@/src/db/download-queries";
import {
  processQueue,
  removeDownload,
  removeAllDownloads,
  initDownloadCache,
  setOnTrackDone,
  isTrackDownloaded as checkDownloaded,
  isTrackQueued as checkQueued,
} from "@/src/services/download-manager";

interface DownloadStoreState {
  // UI state — updated after each track completes
  stats: {
    totalTracks: number;
    completedTracks: number;
    pendingTracks: number;
    errorTracks: number;
    totalBytes: number;
  };

  // Offline mode
  offlineMode: boolean;
  setOfflineMode: (enabled: boolean) => void;

  // Initialization
  initialize: () => Promise<void>;
  resumeDownloads: () => Promise<void>;

  // Pin actions
  pinForOffline: (
    entityType: "track" | "album" | "artist" | "playlist",
    entityId: string,
    sourceId: string
  ) => Promise<void>;
  unpinOffline: (
    entityType: "track" | "album" | "artist" | "playlist",
    entityId: string
  ) => Promise<void>;
  isPinned: (entityType: string, entityId: string) => Promise<boolean>;

  // Queries
  isTrackDownloaded: (trackId: string) => boolean;
  isTrackQueued: (trackId: string) => boolean;

  // Management
  retryFailed: () => Promise<void>;
  removeAll: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useDownloadStore = create<DownloadStoreState>((set, get) => ({
  stats: {
    totalTracks: 0,
    completedTracks: 0,
    pendingTracks: 0,
    errorTracks: 0,
    totalBytes: 0,
  },
  offlineMode: false,

  setOfflineMode: (enabled) => set({ offlineMode: enabled }),

  initialize: async () => {
    await initDownloadCache();

    // Refresh stats in the store every time a track finishes downloading
    setOnTrackDone(() => {
      get().refreshStats();
    });

    await get().refreshStats();
  },

  resumeDownloads: async () => {
    const { stats } = get();
    if (stats.pendingTracks > 0 || stats.errorTracks > 0) {
      // Fire and forget — processQueue runs in background, onTrackDone updates UI
      processQueue();
    }
  },

  pinForOffline: async (entityType, entityId, sourceId) => {
    await addPin(entityType, entityId, sourceId);

    if (entityType === "track") {
      await enqueueTrackDownload(entityId, sourceId);
    } else if (entityType === "album") {
      await enqueueTracksForAlbum(entityId, sourceId);
    } else if (entityType === "artist") {
      await enqueueTracksForArtist(entityId, sourceId);
    } else if (entityType === "playlist") {
      await enqueueTracksForPlaylist(entityId, sourceId);
    }

    await get().refreshStats();
    // Fire and forget — runs in background
    processQueue();
  },

  unpinOffline: async (entityType, entityId) => {
    await removePin(entityType, entityId);

    const orphans = await findOrphanedDownloads();
    for (const trackId of orphans) {
      await removeDownload(trackId);
    }

    await get().refreshStats();
  },

  isPinned: async (entityType, entityId) => {
    const pin = await getPin(entityType, entityId);
    return !!pin;
  },

  isTrackDownloaded: (trackId) => checkDownloaded(trackId),
  isTrackQueued: (trackId) => checkQueued(trackId),

  retryFailed: async () => {
    const { getDownloadsByStatus, updateDownloadStatus } = await import(
      "@/src/db/download-queries"
    );
    const failed = await getDownloadsByStatus("error");
    for (const dl of failed) {
      await updateDownloadStatus(dl.trackId, "pending", { retryCount: 0 });
    }
    await get().refreshStats();
    processQueue();
  },

  removeAll: async () => {
    await removeAllDownloads();
    const { db } = await import("@/src/db/client");
    const { offlinePins } = await import("@/src/db/schema");
    await db.delete(offlinePins);
    set({
      stats: {
        totalTracks: 0,
        completedTracks: 0,
        pendingTracks: 0,
        errorTracks: 0,
        totalBytes: 0,
      },
    });
  },

  refreshStats: async () => {
    const stats = await getDownloadStats();
    set({ stats });
  },
}));
