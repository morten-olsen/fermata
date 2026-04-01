import { create } from "zustand";

import { getTrack, getTracksByAlbum } from "@/src/features/library/library";
import type { SourceAdapter } from "@/src/features/sources/sources";
import { getDownloadedFilePath } from "@/src/features/downloads/downloads";
import {
  recordProgress,
  getResumePosition,
} from "@/src/features/progress/progress";
import type {
  OutputAdapter,
  OutputTrackMetadata,
  Unsubscribe,
} from "@/src/features/outputs/outputs";

import { log, warn, error as logError } from "@/src/shared/lib/log";

/** Tracks the current adapter subscription so we can unsubscribe on transfer */
let currentAdapterUnsub: Unsubscribe | null = null;

/** Tracks pending seek timers so they can be cancelled on new play/transfer */
let pendingSeekTimer: ReturnType<typeof setTimeout> | null = null;

/** Periodic progress recording interval for podcast/audiobook */
let progressInterval: ReturnType<typeof setInterval> | null = null;

/** Previous isPlaying state for detecting pause transitions */
let wasPlaying = false;

function cancelPendingSeek(): void {
  if (pendingSeekTimer) {
    clearTimeout(pendingSeekTimer);
    pendingSeekTimer = null;
  }
}

/** Fisher-Yates shuffle — uniform distribution, unlike sort(Math.random) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface QueueTrack {
  id: string;
  title: string;
  artistName: string;
  albumTitle: string;
  duration: number;
  sourceId: string;
  sourceItemId: string;
  mediaType: string;
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
  /** Re-send the current track to the (possibly changed) active adapter */
  transferPlayback: () => Promise<void>;
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
    await Promise.resolve();

    const adapter = resolveOutput();

    // Subscribe to playback state changes from the active adapter
    subscribeToAdapter(adapter, set);

    set({ isInitialized: true });
    log("Playback store initialized");
  },

  playTrack: async (trackId) => {
    saveCurrentTrackProgress();
    const adapter = resolveOutput();
    log("playTrack:", trackId);

    const dbTrack = await getTrack(trackId);
    if (!dbTrack) {
      warn("playTrack: track not found in DB:", trackId);
      return;
    }

    const queueTrack = dbTrackToQueueTrack(dbTrack);
    set({ queue: [queueTrack] });
    if (!await playTrackOnAdapter(queueTrack, adapter, set)) {
      warn("playTrack: could not resolve stream URL for:", trackId);
    }
  },

  playAlbum: async (albumId, startIndex = 0) => {
    saveCurrentTrackProgress();
    const adapter = resolveOutput();
    log("playAlbum:", albumId, "startIndex:", startIndex);

    const dbTracks = await getTracksByAlbum(albumId);
    log("playAlbum: found", dbTracks.length, "tracks for album", albumId);

    if (dbTracks.length === 0) {
      warn("playAlbum: no tracks found for album:", albumId);
      return;
    }

    const queueTracks = dbTracks.map(dbTrackToQueueTrack);
    await loadQueueOnAdapter(adapter, queueTracks, startIndex, set);
  },

  shuffleAlbum: async (albumId) => {
    saveCurrentTrackProgress();
    const adapter = resolveOutput();
    const dbTracks = await getTracksByAlbum(albumId);
    if (dbTracks.length === 0) return;

    const shuffled = shuffle(dbTracks);
    const queueTracks = shuffled.map(dbTrackToQueueTrack);
    await loadQueueOnAdapter(adapter, queueTracks, 0, set);
  },

  playTracks: async (trackIds, startIndex = 0) => {
    saveCurrentTrackProgress();
    const adapter = resolveOutput();
    const dbTracks = await Promise.all(trackIds.map(getTrack));
    const validDbTracks = dbTracks.filter(Boolean) as NonNullable<
      Awaited<ReturnType<typeof getTrack>>
    >[];
    if (validDbTracks.length === 0) return;

    const queueTracks = validDbTracks.map(dbTrackToQueueTrack);
    await loadQueueOnAdapter(adapter, queueTracks, startIndex, set);
  },

  togglePlayPause: async () => {
    const adapter = resolveOutput();
    const state = adapter.getPlaybackState();
    if (state.isPlaying) {
      await adapter.pause();
    } else {
      await adapter.resume();
    }
  },

  skipNext: async () => {
    saveCurrentTrackProgress();
    const adapter = resolveOutput();
    const { queue, currentTrack } = get();
    const currentIndex = currentTrack
      ? queue.findIndex((t) => t.id === currentTrack.id)
      : -1;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) return;

    if (adapterSupportsQueue(adapter)) {
      set({ currentTrack: queue[nextIndex] });
      await adapter.skipToIndex(nextIndex);
      return;
    }

    await playTrackOnAdapter(queue[nextIndex], adapter, set);
  },

  skipPrevious: async () => {
    saveCurrentTrackProgress();
    const adapter = resolveOutput();
    const { queue, currentTrack, positionMs } = get();

    // If past 3s, restart current track
    if (positionMs > 3000) {
      await adapter.seek(0);
      return;
    }

    const currentIndex = currentTrack
      ? queue.findIndex((t) => t.id === currentTrack.id)
      : -1;

    const prevIndex = currentIndex - 1;

    if (adapterSupportsQueue(adapter)) {
      if (prevIndex >= 0) {
        set({ currentTrack: queue[prevIndex] });
        await adapter.skipToIndex(prevIndex);
      }
      return;
    }

    if (prevIndex < 0) {
      await adapter.seek(0);
      return;
    }

    await playTrackOnAdapter(queue[prevIndex], adapter, set);
  },

  skipToIndex: async (index) => {
    saveCurrentTrackProgress();
    const adapter = resolveOutput();
    const { queue } = get();
    if (index < 0 || index >= queue.length) return;

    if (adapterSupportsQueue(adapter)) {
      set({ currentTrack: queue[index] });
      await adapter.skipToIndex(index);
      return;
    }

    await playTrackOnAdapter(queue[index], adapter, set);
  },

  seekTo: async (positionMs) => {
    const adapter = resolveOutput();
    await adapter.seek(positionMs);
  },

  setVolume: async (volume) => {
    set({ volume });
    const adapter = resolveOutput();
    await adapter.setVolume(volume);
  },

  transferPlayback: async () => {
    const { currentTrack, positionMs, queue } = get();
    if (!currentTrack) return;

    const adapter = resolveOutput();

    // Re-subscribe to the new adapter's state changes
    subscribeToAdapter(adapter, set);

    // For queue-capable adapters (local), reload the full queue
    if (adapter.loadQueue && adapter.capabilities.canQueue) {
      const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
      const resolved = queue
        .map((t) => resolveTrackForOutput(t, adapter))
        .filter(Boolean) as NonNullable<ReturnType<typeof resolveTrackForOutput>>[];
      if (resolved.length > 0) {
        await adapter.loadQueue(
          resolved.map((r) => ({ streamUrl: r.streamUrl, metadata: r.metadata })),
          Math.max(0, currentIndex),
        );
        // Seek after the player has started — immediate seek on a
        // freshly loaded queue is unreliable.
        if (positionMs > 0 && adapter.capabilities.canSeek) {
          scheduleSeekAfterLoad(adapter, positionMs);
        }
      }
      return;
    }

    // For single-track adapters (HA), play and seek once ready
    const resolved = resolveTrackForOutput(currentTrack, adapter);
    if (!resolved) {
      warn("transferPlayback: could not resolve current track for new adapter");
      return;
    }

    await adapter.play(resolved.streamUrl, resolved.metadata);
    await syncLockScreenMetadata(resolved.metadata);

    // Seek to the saved position once the speaker reports a duration.
    // HA speakers need time to load media before they accept seek commands.
    if (positionMs > 3000 && adapter.capabilities.canSeek) {
      scheduleSeekAfterLoad(adapter, positionMs);
    }

    log("Playback transferred to new adapter at position", positionMs);
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
    mediaType: dbTrack.mediaType,
  };
}

/** Whether this track type needs progress tracking */
function needsProgressTracking(mediaType: string): boolean {
  return mediaType === "podcast" || mediaType === "audiobook";
}

/**
 * Adapter resolver — injected at init to avoid store-to-store imports.
 * Set by the root layout after both stores are initialized.
 */
let resolveSourceAdapter: (sourceId: string) => SourceAdapter | undefined =
  () => undefined;

export function setAdapterResolver(
  resolver: (sourceId: string) => SourceAdapter | undefined,
) {
  resolveSourceAdapter = resolver;
}

/**
 * Output resolver — injected at init to get the active output adapter.
 * Set by the root layout after the outputs store is initialized.
 */
let resolveOutput: () => OutputAdapter = () => {
  // Fallback that should never be reached after init
  throw new Error("Output resolver not set — call setOutputResolver first");
};

export function setOutputResolver(resolver: () => OutputAdapter) {
  resolveOutput = resolver;
}

/**
 * Local adapter resolver — used to update lock screen metadata
 * when a network output adapter is active.
 */
let resolveLocalAdapter: (() => OutputAdapter) | null = null;

export function setLocalAdapterResolver(
  resolver: () => OutputAdapter,
) {
  resolveLocalAdapter = resolver;
}

/** Update RNTP lock screen notification when playing through a network adapter. */
async function syncLockScreenMetadata(
  metadata: OutputTrackMetadata,
): Promise<void> {
  const output = resolveOutput();
  if (!output.capabilities.isNetworkOutput) return;
  const local = resolveLocalAdapter?.();
  await local?.showNotificationForRemotePlayback?.(metadata);
}

/** Subscribe to the adapter's playback state changes and sync to the store.
 *  Automatically unsubscribes from any previous adapter.
 *  Records progress for podcast/audiobook on pause. */
function subscribeToAdapter(
  adapter: OutputAdapter,
  set: (partial: Partial<PlaybackStoreState>) => void,
): void {
  // Unsubscribe from previous adapter to prevent stale state updates
  currentAdapterUnsub?.();
  stopProgressInterval();
  wasPlaying = false;

  currentAdapterUnsub = adapter.onPlaybackStateChange((state) => {
    set({
      isPlaying: state.isPlaying,
      positionMs: state.positionMs,
      durationMs: state.durationMs,
    });

    // Record progress on pause transition for podcast/audiobook
    if (wasPlaying && !state.isPlaying && state.positionMs > 0) {
      const { currentTrack } = usePlaybackStore.getState();
      if (currentTrack && needsProgressTracking(currentTrack.mediaType)) {
        recordProgress(currentTrack.id, state.positionMs, state.durationMs)
          .catch(() => { /* progress save is best-effort */ });
      }
    }

    // Manage periodic progress interval
    if (state.isPlaying && !wasPlaying) {
      startProgressInterval();
    } else if (!state.isPlaying && wasPlaying) {
      stopProgressInterval();
    }

    wasPlaying = state.isPlaying;
  });
}

const PROGRESS_INTERVAL_MS = 30_000;

function startProgressInterval(): void {
  stopProgressInterval();
  progressInterval = setInterval(() => {
    const { currentTrack, positionMs, durationMs } = usePlaybackStore.getState();
    if (currentTrack && needsProgressTracking(currentTrack.mediaType) && positionMs > 0) {
      recordProgress(currentTrack.id, positionMs, durationMs)
        .catch(() => { /* progress save is best-effort */ });
    }
  }, PROGRESS_INTERVAL_MS);
}

function stopProgressInterval(): void {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

/** Save progress for the current track before switching to a new one. */
function saveCurrentTrackProgress(): void {
  const { currentTrack, positionMs, durationMs } = usePlaybackStore.getState();
  if (currentTrack && needsProgressTracking(currentTrack.mediaType) && positionMs > 0) {
    recordProgress(currentTrack.id, positionMs, durationMs)
      .catch(() => { /* progress save is best-effort */ });
  }
}

/** Resolve a track, set it as current, play on adapter, sync lock screen.
 *  For podcast/audiobook tracks, resumes from saved position. */
async function playTrackOnAdapter(
  track: QueueTrack,
  adapter: OutputAdapter,
  set: (partial: Partial<PlaybackStoreState>) => void,
): Promise<boolean> {
  cancelPendingSeek();
  const resolved = resolveTrackForOutput(track, adapter);
  if (!resolved) {
    warn("playTrackOnAdapter: could not resolve track:", track.id, track.title);
    return false;
  }
  log("playTrackOnAdapter: playing", track.title, "→", resolved.streamUrl.substring(0, 100));
  set({ currentTrack: track });
  try {
    await adapter.play(resolved.streamUrl, resolved.metadata);
  } catch (e) {
    logError("playTrackOnAdapter: adapter.play() failed for", track.title, ":", e);
    return false;
  }
  await syncLockScreenMetadata(resolved.metadata);

  // Resume from saved position for podcast/audiobook tracks
  if (needsProgressTracking(track.mediaType) && adapter.capabilities.canSeek) {
    const resumeMs = await getResumePosition(track.id);
    if (resumeMs > 0) {
      log("Resuming", track.title, "from", Math.round(resumeMs / 1000), "s");
      scheduleSeekAfterLoad(adapter, resumeMs);
    }
  }

  return true;
}

/** Check if adapter supports queue operations */
function adapterSupportsQueue(adapter: OutputAdapter): adapter is OutputAdapter & Required<Pick<OutputAdapter, "loadQueue" | "skipToIndex">> {
  return adapter.capabilities.canQueue && !!adapter.loadQueue && !!adapter.skipToIndex;
}

/**
 * Seek to a position after a delay, retrying once on failure.
 *
 * Network speakers (HA) need time to load media before accepting seek.
 * RNTP needs a moment to buffer after queue reload. Rather than trying
 * to detect readiness via state listeners (which race with stale state
 * from polling), we use a simple delay + retry approach.
 */
function scheduleSeekAfterLoad(
  adapter: OutputAdapter,
  positionMs: number,
): void {
  // Local adapters are fast — short delay. Network adapters need more time.
  cancelPendingSeek();

  const isLocal = !adapter.capabilities.isNetworkOutput;
  const firstDelay = isLocal ? 300 : 3000;
  const retryDelay = isLocal ? 500 : 3000;

  pendingSeekTimer = setTimeout(() => {
    pendingSeekTimer = null;
    adapter.seek(positionMs).then(
      () => {
        log("scheduleSeekAfterLoad: seeked to", positionMs);
      },
      () => {
        log("scheduleSeekAfterLoad: first seek failed, retrying...");
        pendingSeekTimer = setTimeout(() => {
          pendingSeekTimer = null;
          adapter.seek(positionMs).catch(() => {
            warn("scheduleSeekAfterLoad: seek retry failed, giving up");
          });
        }, retryDelay);
      },
    );
  }, firstDelay);
}

/**
 * Resolve a queue track to a stream URL + metadata for the given output adapter.
 * Returns null if the track can't be played on this output.
 */
function resolveTrackForOutput(
  queueTrack: QueueTrack,
  output: OutputAdapter,
): { streamUrl: string; metadata: OutputTrackMetadata } | null {
  // Prefer local downloaded file
  const localPath = getDownloadedFilePath(queueTrack.id);
  if (localPath && output.capabilities.canPlayLocalFiles) {
    const adapter = resolveSourceAdapter(queueTrack.sourceId);
    return {
      streamUrl: localPath,
      metadata: {
        trackId: queueTrack.id,
        title: queueTrack.title,
        artistName: queueTrack.artistName,
        albumTitle: queueTrack.albumTitle,
        artworkUrl: adapter?.getArtworkUrl(queueTrack.sourceItemId, "medium"),
        durationMs: queueTrack.duration * 1000,
      },
    };
  }

  // Fall back to streaming from source
  const adapter = resolveSourceAdapter(queueTrack.sourceId);
  if (!adapter) {
    warn("resolveTrackForOutput: no adapter for source:", queueTrack.sourceId);
    return null;
  }

  // Check if the output can stream from a URL
  if (!output.capabilities.canStreamFromUrl && !output.capabilities.canPlayLocalFiles) {
    warn("resolveTrackForOutput: output can't play this track:", queueTrack.id);
    return null;
  }

  return {
    streamUrl: adapter.getStreamUrl(queueTrack.sourceItemId),
    metadata: {
      trackId: queueTrack.id,
      title: queueTrack.title,
      artistName: queueTrack.artistName,
      albumTitle: queueTrack.albumTitle,
      artworkUrl: adapter.getArtworkUrl(queueTrack.sourceItemId, "medium"),
      durationMs: queueTrack.duration * 1000,
    },
  };
}

/** Load a queue of tracks on the adapter, using bulk load if supported */
async function loadQueueOnAdapter(
  adapter: OutputAdapter,
  queueTracks: QueueTrack[],
  startIndex: number,
  set: (partial: Partial<PlaybackStoreState>) => void,
): Promise<void> {
  const resolved = queueTracks
    .map((t) => resolveTrackForOutput(t, adapter))
    .filter(Boolean) as NonNullable<ReturnType<typeof resolveTrackForOutput>>[];

  if (resolved.length === 0) {
    warn("loadQueueOnAdapter: no tracks could be resolved (adapter missing?)");
    return;
  }

  set({
    queue: queueTracks,
    currentTrack: queueTracks[startIndex] ?? queueTracks[0],
  });

  cancelPendingSeek();

  try {
    if (adapterSupportsQueue(adapter)) {
      await adapter.loadQueue(
        resolved.map((r) => ({ streamUrl: r.streamUrl, metadata: r.metadata })),
        startIndex,
      );
    } else {
      const target = resolved[startIndex] ?? resolved[0];
      await adapter.play(target.streamUrl, target.metadata);
    }
    const metaTarget = resolved[startIndex] ?? resolved[0];
    await syncLockScreenMetadata(metaTarget.metadata);

    // Resume from saved position for podcast/audiobook tracks
    const startTrack = queueTracks[startIndex] ?? queueTracks[0];
    if (needsProgressTracking(startTrack.mediaType) && adapter.capabilities.canSeek) {
      const resumeMs = await getResumePosition(startTrack.id);
      if (resumeMs > 0) {
        log("Resuming", startTrack.title, "from", Math.round(resumeMs / 1000), "s");
        scheduleSeekAfterLoad(adapter, resumeMs);
      }
    }
  } catch (e) {
    logError("loadQueueOnAdapter failed:", e);
  }
}
