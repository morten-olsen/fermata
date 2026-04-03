import { log, warn } from "@/src/shared/lib/log";

import {
  playMedia,
  pauseMedia,
  resumeMedia,
  stopMedia,
  seekMedia,
  setVolumeLevel,
  interpolatePosition,
} from "@/src/services/outputs/home-assistant/home-assistant.api";
import type { Connection } from "@/src/services/outputs/home-assistant/home-assistant.api";
import type { HAMediaPlayerState } from "@/src/services/outputs/home-assistant/home-assistant.types";

import type { ReconcilePayload } from "../playback.types";
import { PlaybackPlayer } from "../playback.player";

const POSITION_POLL_INTERVAL = 1000;
const SEEK_DELAY = 3000;
const SEEK_RETRY_DELAY = 3000;

/**
 * Home Assistant playback player.
 *
 * Routes audio to an HA media_player entity via WebSocket.
 * Does NOT manage the connection lifecycle — that is OutputsService's job.
 * Receives a connection + entityId from OutputsService when created.
 *
 * On reconcile, ignores the queue and just plays the current item.
 * HA speakers don't support native queueing.
 */
class HAPlaybackPlayer extends PlaybackPlayer {
  readonly handlesQueue = false;

  #connection: Connection;
  #entityId: string;
  #entityStates: Partial<Record<string, HAMediaPlayerState>> = {};
  #positionInterval: ReturnType<typeof setInterval> | null = null;
  #pendingSeekTimer: ReturnType<typeof setTimeout> | null = null;
  #lastIsPlaying = false;
  #entityUnsub: (() => void) | null = null;

  constructor(connection: Connection, entityId: string) {
    super();
    this.#connection = connection;
    this.#entityId = entityId;
  }

  /**
   * Start listening to entity state changes and polling position.
   * Called by OutputsService after creating the player.
   */
  public start = (
    onEntityState: (cb: (states: Partial<Record<string, HAMediaPlayerState>>) => void) => (() => void),
  ) => {
    this.#entityUnsub = onEntityState((states) => {
      this.#entityStates = states;
      this.#notifyStateIfChanged();
    });

    this.#positionInterval = setInterval(() => {
      const state = this.#entityStates[this.#entityId];
      if (state?.state === "playing") {
        const positionSeconds = interpolatePosition(state);
        const durationMs = (state.attributes.media_duration ?? 0) * 1000;
        this.emit('progress', positionSeconds * 1000, durationMs);
      }
    }, POSITION_POLL_INTERVAL);
  };

  public reconcile = async (payload: ReconcilePayload) => {
    this.#cancelPendingSeek();

    const item = payload.queue[payload.currentIndex];
    if (!item) {
      warn("HAPlaybackPlayer: no item at index", payload.currentIndex);
      return;
    }

    await playMedia(
      this.#connection,
      this.#entityId,
      item.streamUrl,
      `${item.metadata.title} — ${item.metadata.artistName}`,
      item.metadata.artworkUrl,
    );

    await setVolumeLevel(this.#connection, this.#entityId, payload.volume);

    // HA speakers need time to load media before accepting seek
    if (payload.positionMs > 0) {
      this.#scheduleSeek(payload.positionMs);
    }

    log("HAPlaybackPlayer reconciled:", item.metadata.title);
  };

  /**
   * For HA, skipTo is the same as reconcile — play the item at the given index.
   * The service resolves the URL and calls reconcile with a single-item payload.
   * This method is here for interface compliance but the service uses reconcile directly.
   */
  public skipTo = async (_index: number, _positionMs: number) => {
    // Not called directly — the service calls reconcile for non-queue players
    warn("HAPlaybackPlayer.skipTo should not be called directly");
  };

  public pause = async () => {
    await pauseMedia(this.#connection, this.#entityId);
  };

  public resume = async () => {
    await resumeMedia(this.#connection, this.#entityId);
  };

  public seek = async (positionMs: number) => {
    this.#cancelPendingSeek();
    await seekMedia(this.#connection, this.#entityId, positionMs / 1000);
  };

  public setVolume = async (volume: number) => {
    await setVolumeLevel(this.#connection, this.#entityId, volume);
  };

  public stop = async () => {
    this.#cancelPendingSeek();
    try {
      await stopMedia(this.#connection, this.#entityId);
    } catch {
      // Entity may already be idle
    }
  };

  public dispose = async () => {
    this.#cancelPendingSeek();
    this.#entityUnsub?.();
    this.#entityUnsub = null;

    if (this.#positionInterval) {
      clearInterval(this.#positionInterval);
      this.#positionInterval = null;
    }
    // Do NOT close the connection — OutputsService owns it
  };

  // ── Private ─────────────────────────────────────────

  #notifyStateIfChanged = () => {
    const state = this.#entityStates[this.#entityId];
    if (!state) return;

    const isPlaying = state.state === "playing";
    if (isPlaying !== this.#lastIsPlaying) {
      this.#lastIsPlaying = isPlaying;
      this.emit('stateChanged', isPlaying);
    }
  };

  #scheduleSeek = (positionMs: number) => {
    this.#cancelPendingSeek();
    this.#pendingSeekTimer = setTimeout(() => {
      this.#pendingSeekTimer = null;
      seekMedia(this.#connection, this.#entityId, positionMs / 1000).then(
        () => log("HAPlaybackPlayer: seeked to", positionMs),
        () => {
          this.#pendingSeekTimer = setTimeout(() => {
            this.#pendingSeekTimer = null;
            seekMedia(this.#connection, this.#entityId, positionMs / 1000).catch(() => {
              warn("HAPlaybackPlayer: seek retry failed");
            });
          }, SEEK_RETRY_DELAY);
        },
      );
    }, SEEK_DELAY);
  };

  #cancelPendingSeek = () => {
    if (this.#pendingSeekTimer) {
      clearTimeout(this.#pendingSeekTimer);
      this.#pendingSeekTimer = null;
    }
  };
}

export { HAPlaybackPlayer };
