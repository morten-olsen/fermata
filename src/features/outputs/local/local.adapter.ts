import { log, warn, error as logError } from "@/src/shared/lib/log";

import type {
  OutputAdapter,
  OutputAdapterCapabilities,
  OutputConnectionState,
  OutputTrackMetadata,
  PlaybackState,
  Unsubscribe,
} from "../outputs.types";

// Lazy-load Track Player to avoid crash when native module isn't available (Expo Go)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let TP: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let TPState: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let TPEvent: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let TPCapability: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let TPAppKilled: any = null;

try {
  const mod = require("react-native-track-player");
  TP = mod.default;
  TPState = mod.State;
  TPEvent = mod.Event;
  TPCapability = mod.Capability;
  TPAppKilled = mod.AppKilledPlaybackBehavior;
  log("Track Player loaded successfully");
} catch (e) {
  warn("react-native-track-player not available:", e);
}

export class LocalOutputAdapter implements OutputAdapter {
  readonly id: string;
  readonly type = "local";
  readonly name: string;
  readonly capabilities: OutputAdapterCapabilities = {
    canStreamFromUrl: true,
    canPlayLocalFiles: true,
    canSeek: true,
    canSetVolume: true,
    canReportPosition: true,
    canQueue: true,
    isNetworkOutput: false,
  };

  private connectionState: OutputConnectionState = "disconnected";
  private connectionStateListeners = new Set<
    (state: OutputConnectionState) => void
  >();
  private playbackStateListeners = new Set<(state: PlaybackState) => void>();
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private currentState: PlaybackState = {
    isPlaying: false,
    positionMs: 0,
    durationMs: 0,
  };

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  async connect(): Promise<void> {
    if (this.connectionState === "connected") return;

    if (!TP || !TPCapability || !TPEvent || !TPState || !TPAppKilled) {
      warn("LocalOutputAdapter: Track Player not available, skipping init");
      this.setConnectionState("connected"); // Don't block app
      return;
    }

    this.setConnectionState("connecting");

    try {
      await TP.setupPlayer({ autoHandleInterruptions: true });
      log("Track Player setup complete");

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      TP.addEventListener(TPEvent.PlaybackState, ({ state }: { state: any }) => {
        const isPlaying =
          state === TPState.Playing || state === TPState.Buffering;
        this.updateState({ isPlaying });
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      TP.addEventListener(TPEvent.PlaybackActiveTrackChanged, ({ track }: { track: any }) => {
        if (track) {
          this.updateState({
            trackId: track.id as string | undefined,
            durationMs: (track.duration ?? 0) * 1000,
            positionMs: 0,
          });
        } else {
          this.updateState({
            trackId: undefined,
            positionMs: 0,
            durationMs: 0,
          });
        }
      });

      if (this.progressInterval) clearInterval(this.progressInterval);
      this.progressInterval = setInterval(() => {
        void this.pollProgress();
      }, 500);

      this.setConnectionState("connected");
      log("LocalOutputAdapter initialized");
    } catch (e) {
      logError("LocalOutputAdapter init failed:", e);
      this.setConnectionState("connected"); // Don't block app on failure
    }
  }

  async disconnect(): Promise<void> {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    if (TP) {
      try {
        await TP.reset();
      } catch {
        // Player not ready
      }
    }
    this.setConnectionState("disconnected");
  }

  getConnectionState(): OutputConnectionState {
    return this.connectionState;
  }

  onConnectionStateChange(
    cb: (state: OutputConnectionState) => void,
  ): Unsubscribe {
    this.connectionStateListeners.add(cb);
    return () => this.connectionStateListeners.delete(cb);
  }

  async play(streamUrl: string, track: OutputTrackMetadata): Promise<void> {
    if (!TP) return;
    try {
      await TP.reset();
      await TP.add({
        id: track.trackId,
        url: streamUrl,
        title: track.title,
        artist: track.artistName,
        album: track.albumTitle,
        artwork: track.artworkUrl,
        duration: track.durationMs / 1000,
      });
      await TP.play();
    } catch (e) {
      logError("LocalOutputAdapter play failed:", e);
    }
  }

  async pause(): Promise<void> {
    if (!TP) return;
    await TP.pause();
  }

  async resume(): Promise<void> {
    if (!TP) return;
    await TP.play();
  }

  async stop(): Promise<void> {
    if (!TP) return;
    await TP.reset();
  }

  async seek(positionMs: number): Promise<void> {
    if (!TP) return;
    await TP.seekTo(positionMs / 1000);
  }

  async setVolume(volume: number): Promise<void> {
    if (!TP) return;
    try {
      await TP.setVolume(volume);
    } catch {
      // Player not ready
    }
  }

  async loadQueue(
    tracks: Array<{ streamUrl: string; metadata: OutputTrackMetadata }>,
    startIndex = 0,
  ): Promise<void> {
    if (!TP) return;
    const rnTracks = tracks.map((t) => ({
      id: t.metadata.trackId,
      url: t.streamUrl,
      title: t.metadata.title,
      artist: t.metadata.artistName,
      album: t.metadata.albumTitle,
      artwork: t.metadata.artworkUrl,
      duration: t.metadata.durationMs / 1000,
    }));

    try {
      await TP.reset();
      await TP.add(rnTracks);
      if (startIndex > 0 && startIndex < rnTracks.length) {
        await TP.skip(startIndex);
      }
      await TP.play();
    } catch (e) {
      logError("LocalOutputAdapter loadQueue failed:", e);
    }
  }

  async skipToIndex(index: number): Promise<void> {
    if (!TP) return;
    try {
      await TP.skip(index);
      await TP.play();
    } catch {
      // Invalid index
    }
  }

  getPlaybackState(): PlaybackState {
    return { ...this.currentState };
  }

  onPlaybackStateChange(cb: (state: PlaybackState) => void): Unsubscribe {
    this.playbackStateListeners.add(cb);
    return () => this.playbackStateListeners.delete(cb);
  }

  // ── RNTP helpers for notification-only mode ───────────────

  /**
   * Show a lock screen notification with the given track metadata
   * without actually playing audio. Used when a network output
   * adapter is active — RNTP provides the notification UI while
   * the remote speaker handles the audio.
   *
   * Loads a silent placeholder into RNTP so the notification
   * infrastructure is active, then updates the metadata.
   */
  async showNotificationForRemotePlayback(
    track: OutputTrackMetadata,
  ): Promise<void> {
    if (!TP) return;
    try {
      // Reset and load a placeholder so RNTP creates a notification.
      // Using an empty data URI avoids any network request or file read.
      await TP.reset();
      await TP.add({
        id: `remote-${track.trackId}`,
        url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
        title: track.title,
        artist: track.artistName,
        album: track.albumTitle,
        artwork: track.artworkUrl,
        duration: track.durationMs / 1000,
      });
      // Don't call play() — we just need the notification visible
    } catch {
      // Player not ready
    }
  }

  // ── Private ─────────────────────────────────────────────

  private async pollProgress(): Promise<void> {
    if (!TP) return;
    try {
      const { position, duration } = await TP.getProgress();
      this.updateState({
        positionMs: position * 1000,
        durationMs: duration * 1000,
      });
    } catch {
      // Player not ready
    }
  }

  private setConnectionState(state: OutputConnectionState) {
    this.connectionState = state;
    this.connectionStateListeners.forEach((cb) => cb(state));
  }

  private updateState(partial: Partial<PlaybackState>) {
    this.currentState = { ...this.currentState, ...partial };
    this.playbackStateListeners.forEach((cb) =>
      cb({ ...this.currentState }),
    );
  }
}
