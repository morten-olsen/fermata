import { EventEmitter } from "@/src/utils/utils.event-emitter";

import type { PlaybackPlayerEvents, ReconcilePayload } from "./playback.types";

/**
 * Abstract playback player — a dumb I/O device that the PlaybackService drives.
 *
 * The service owns all state (queue, position, volume). The player receives
 * a full snapshot via `reconcile()` and decides internally how best to handle it.
 *
 * Players that handle their own queue (`handlesQueue = true`) auto-advance
 * through tracks and emit `trackEnded` so the service can sync its index.
 * Players without queue support (`handlesQueue = false`) play one item at a
 * time — the service drives all track advancement.
 */
abstract class PlaybackPlayer extends EventEmitter<PlaybackPlayerEvents> {
  /** Whether this player manages its own queue and auto-advances tracks. */
  abstract readonly handlesQueue: boolean;

  /**
   * Push the full playback state to the player.
   *
   * Called on initial play, queue change, and player transfer.
   * The player receives the full queue (resolved stream URLs + metadata),
   * the current index, seek position, and volume.
   */
  abstract reconcile(payload: ReconcilePayload): Promise<void>;

  /**
   * Skip to a track within the current queue.
   *
   * For queue-capable players, this uses native skip (no queue reload).
   * For single-track players, this loads the new track directly.
   */
  abstract skipTo(index: number, positionMs: number): Promise<void>;

  abstract pause(): Promise<void>;
  abstract resume(): Promise<void>;
  abstract seek(positionMs: number): Promise<void>;
  abstract setVolume(volume: number): Promise<void>;
  abstract stop(): Promise<void>;
  abstract dispose(): Promise<void>;
}

export { PlaybackPlayer };
