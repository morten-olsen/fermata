import { create } from "zustand";
import { getTrack, getTracksByAlbum } from "../db/queries";
import type { SourceAdapter } from "../adapters/sources/types";
import { getDownloadedFilePath } from "../services/download-manager";
import { log, warn, error as logError } from "../lib/log";

/** Fisher-Yates shuffle — uniform distribution, unlike sort(Math.random) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let progressInterval: ReturnType<typeof setInterval> | null = null;

// Lazy-load Track Player to avoid crash when native module isn't available (Expo Go)
let TP: typeof import("react-native-track-player").default | null = null;
let TPState: typeof import("react-native-track-player").State | null = null;
let TPEvent: typeof import("react-native-track-player").Event | null = null;
let TPCapability: typeof import("react-native-track-player").Capability | null =
  null;
let TPAppKilled: typeof import("react-native-track-player").AppKilledPlaybackBehavior | null =
  null;

try {
  const mod = require("react-native-track-player");
  TP = mod.default;
  TPState = mod.State;
  TPEvent = mod.Event;
  TPCapability = mod.Capability;
  TPAppKilled = mod.AppKilledPlaybackBehavior;
  log(" Track Player loaded successfully");
} catch (e) {
  warn(" react-native-track-player not available:", e);
}

interface QueueTrack {
  id: string;
  title: string;
  artistName: string;
  albumTitle: string;
  duration: number;
  sourceId: string;
  sourceItemId: string;
}

interface PlaybackStoreState {
  isInitialized: boolean;
  isPlaying: boolean;
  currentTrack: QueueTrack | null;
  queue: QueueTrack[];
  positionMs: number;
  durationMs: number;
  volume: number; // 0–1

  initialize: () => Promise<void>;
  playTrack: (trackId: string) => Promise<void>;
  playAlbum: (albumId: string, startIndex?: number) => Promise<void>;
  shuffleAlbum: (albumId: string) => Promise<void>;
  playTracks: (trackIds: string[], startIndex?: number) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  skipToIndex: (index: number) => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
}

export const usePlaybackStore = create<PlaybackStoreState>((set, get) => ({
  isInitialized: false,
  isPlaying: false,
  currentTrack: null,
  queue: [],
  positionMs: 0,
  durationMs: 0,
  volume: 1,

  initialize: async () => {
    if (get().isInitialized) return;

    if (!TP || !TPCapability || !TPEvent || !TPState || !TPAppKilled) {
      warn(" Track Player not available, skipping init");
      set({ isInitialized: true });
      return;
    }

    try {
      await TP.setupPlayer({ autoHandleInterruptions: true });
      log(" Track Player setup complete");

      await TP.updateOptions({
        android: {
          appKilledPlaybackBehavior:
            TPAppKilled.StopPlaybackAndRemoveNotification,
        },
        capabilities: [
          TPCapability.Play,
          TPCapability.Pause,
          TPCapability.SkipToNext,
          TPCapability.SkipToPrevious,
          TPCapability.SeekTo,
        ],
        notificationCapabilities: [
          TPCapability.Play,
          TPCapability.Pause,
          TPCapability.SkipToNext,
          TPCapability.SkipToPrevious,
        ],
      });

      TP.addEventListener(TPEvent.PlaybackState, ({ state }) => {
        set({
          isPlaying: state === TPState!.Playing || state === TPState!.Buffering,
        });
      });

      TP.addEventListener(TPEvent.PlaybackActiveTrackChanged, ({ track }) => {
        if (track) {
          const current = get().queue.find((t) => t.id === track.id);
          set({
            currentTrack: current ?? null,
            durationMs: (track.duration ?? 0) * 1000,
            positionMs: 0,
          });
        } else {
          set({ currentTrack: null, positionMs: 0, durationMs: 0 });
        }
      });

      if (progressInterval) clearInterval(progressInterval);
      progressInterval = setInterval(async () => {
        try {
          const { position, duration } = await TP!.getProgress();
          set({ positionMs: position * 1000, durationMs: duration * 1000 });
        } catch {
          // Player not ready
        }
      }, 500);

      set({ isInitialized: true });
      log(" Track Player initialized");
    } catch (e) {
      logError(" Track Player init failed:", e);
      set({ isInitialized: true }); // Don't block app on failure
    }
  },

  playTrack: async (trackId) => {
    if (!TP) {
      warn(" playTrack: Track Player not available");
      return;
    }
    log(" playTrack:", trackId);

    const dbTrack = await getTrack(trackId);
    if (!dbTrack) {
      warn(" playTrack: track not found in DB:", trackId);
      return;
    }

    const queueTrack = dbTrackToQueueTrack(dbTrack);
    const rnTrack = toRNTrack(queueTrack);
    if (!rnTrack) {
      warn(" playTrack: could not resolve stream URL for:", trackId);
      return;
    }

    log(" playTrack: streaming from:", rnTrack.url);
    try {
      await TP.reset();
      await TP.add(rnTrack);
      set({ queue: [queueTrack], currentTrack: queueTrack });
      await TP.play();
    } catch (e) {
      logError(" playTrack failed:", e);
    }
  },

  playAlbum: async (albumId, startIndex = 0) => {
    if (!TP) {
      warn(" playAlbum: Track Player not available");
      return;
    }
    log(" playAlbum:", albumId, "startIndex:", startIndex);

    const dbTracks = await getTracksByAlbum(albumId);
    log(" playAlbum: found", dbTracks.length, "tracks for album", albumId);

    if (dbTracks.length === 0) {
      warn(" playAlbum: no tracks found for album:", albumId);
      return;
    }

    const queueTracks = dbTracks.map(dbTrackToQueueTrack);
    const rnTracks = queueTracks.map(toRNTrack).filter(Boolean) as NonNullable<
      ReturnType<typeof toRNTrack>
    >[];

    log(" playAlbum:", rnTracks.length, "tracks resolved with stream URLs");

    if (rnTracks.length === 0) {
      warn(" playAlbum: no tracks could be resolved (adapter missing?)");
      return;
    }

    try {
      await TP.reset();
      await TP.add(rnTracks);
      if (startIndex > 0 && startIndex < rnTracks.length) {
        await TP.skip(startIndex);
      }
      set({
        queue: queueTracks,
        currentTrack: queueTracks[startIndex] ?? queueTracks[0],
      });
      await TP.play();
    } catch (e) {
      logError(" playAlbum failed:", e);
    }
  },

  shuffleAlbum: async (albumId) => {
    if (!TP) return;
    const dbTracks = await getTracksByAlbum(albumId);
    if (dbTracks.length === 0) return;

    const shuffled = shuffle(dbTracks);
    const queueTracks = shuffled.map(dbTrackToQueueTrack);
    const rnTracks = queueTracks.map(toRNTrack).filter(Boolean) as NonNullable<
      ReturnType<typeof toRNTrack>
    >[];
    if (rnTracks.length === 0) return;

    try {
      await TP.reset();
      await TP.add(rnTracks);
      set({ queue: queueTracks, currentTrack: queueTracks[0] });
      await TP.play();
    } catch (e) {
      logError(" shuffleAlbum failed:", e);
    }
  },

  playTracks: async (trackIds, startIndex = 0) => {
    if (!TP) return;
    const dbTracks = await Promise.all(trackIds.map(getTrack));
    const validDbTracks = dbTracks.filter(Boolean) as NonNullable<
      Awaited<ReturnType<typeof getTrack>>
    >[];
    if (validDbTracks.length === 0) return;

    const queueTracks = validDbTracks.map(dbTrackToQueueTrack);
    const rnTracks = queueTracks.map(toRNTrack).filter(Boolean) as NonNullable<
      ReturnType<typeof toRNTrack>
    >[];
    if (rnTracks.length === 0) return;

    try {
      await TP.reset();
      await TP.add(rnTracks);
      if (startIndex > 0 && startIndex < rnTracks.length) {
        await TP.skip(startIndex);
      }
      set({
        queue: queueTracks,
        currentTrack: queueTracks[startIndex] ?? queueTracks[0],
      });
      await TP.play();
    } catch (e) {
      logError(" playTracks failed:", e);
    }
  },

  togglePlayPause: async () => {
    if (!TP || !TPState) return;
    const state = await TP.getPlaybackState();
    if (state.state === TPState.Playing) {
      await TP.pause();
    } else {
      await TP.play();
    }
  },

  skipNext: async () => {
    if (!TP) return;
    try {
      await TP.skipToNext();
    } catch {
      // No next track
    }
  },

  skipPrevious: async () => {
    if (!TP) return;
    try {
      const { position } = await TP.getProgress();
      if (position > 3) {
        await TP.seekTo(0);
      } else {
        await TP.skipToPrevious();
      }
    } catch {
      // No previous track
    }
  },

  skipToIndex: async (index) => {
    if (!TP) return;
    try {
      await TP.skip(index);
      await TP.play();
    } catch {
      // Invalid index
    }
  },

  seekTo: async (positionMs) => {
    if (!TP) return;
    await TP.seekTo(positionMs / 1000);
  },

  setVolume: async (volume) => {
    set({ volume });
    if (!TP) return;
    try {
      await TP.setVolume(volume);
    } catch {
      // Player not ready
    }
  },
}));

// ── Helpers ────────────────────────────────────────────

type DbTrack = NonNullable<Awaited<ReturnType<typeof getTrack>>>;

function dbTrackToQueueTrack(dbTrack: DbTrack): QueueTrack {
  return {
    id: dbTrack.id,
    title: dbTrack.title,
    artistName: dbTrack.artistName,
    albumTitle: dbTrack.albumTitle,
    duration: dbTrack.duration,
    sourceId: dbTrack.sourceId,
    sourceItemId: dbTrack.sourceItemId,
  };
}

/**
 * Adapter resolver — injected at init to avoid store-to-store imports.
 * Set by the root layout after both stores are initialized.
 */
let resolveAdapter: (sourceId: string) => SourceAdapter | undefined = () =>
  undefined;

export function setAdapterResolver(
  resolver: (sourceId: string) => SourceAdapter | undefined
) {
  resolveAdapter = resolver;
}

function toRNTrack(queueTrack: QueueTrack) {
  // Prefer local downloaded file over streaming
  const localPath = getDownloadedFilePath(queueTrack.id);
  if (localPath) {
    const adapter = resolveAdapter(queueTrack.sourceId);
    return {
      id: queueTrack.id,
      url: localPath,
      title: queueTrack.title,
      artist: queueTrack.artistName,
      album: queueTrack.albumTitle,
      artwork: adapter?.getArtworkUrl(queueTrack.sourceItemId, "medium"),
      duration: queueTrack.duration,
    };
  }

  // Fall back to streaming
  const adapter = resolveAdapter(queueTrack.sourceId);
  if (!adapter) {
    warn("toRNTrack: no adapter for source:", queueTrack.sourceId);
    return null;
  }

  return {
    id: queueTrack.id,
    url: adapter.getStreamUrl(queueTrack.sourceItemId),
    title: queueTrack.title,
    artist: queueTrack.artistName,
    album: queueTrack.albumTitle,
    artwork: adapter.getArtworkUrl(queueTrack.sourceItemId, "medium"),
    duration: queueTrack.duration,
  };
}
