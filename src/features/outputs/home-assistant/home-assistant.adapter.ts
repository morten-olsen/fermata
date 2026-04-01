import { log, warn, error as logError } from "@/src/shared/lib/log";

import type {
  OutputAdapter,
  OutputAdapterCapabilities,
  OutputConnectionState,
  OutputEntity,
  OutputTrackMetadata,
  PlaybackState,
  Unsubscribe,
} from "../outputs.types";

import {
  connectToHA,
  subscribeToAllEntities,
  playMedia,
  pauseMedia,
  resumeMedia,
  stopMedia,
  seekMedia,
  setVolumeLevel,
  interpolatePosition,
} from "./home-assistant.api";
import type { Connection } from "./home-assistant.api";
import type {
  HAMediaPlayerState,
} from "./home-assistant.types";

const POSITION_POLL_INTERVAL = 1000;
const RECONNECT_DELAYS = [0, 1000, 2000, 4000, 8000, 16000, 30000];
const MAX_RECONNECT_ATTEMPTS = 5;

export class HAOutputAdapter implements OutputAdapter {
  readonly id: string;
  readonly type = "home-assistant";
  readonly name: string;
  readonly capabilities: OutputAdapterCapabilities = {
    canStreamFromUrl: true,
    canPlayLocalFiles: false,
    canSeek: true,
    canSetVolume: true,
    canReportPosition: true,
    canQueue: false,
    isNetworkOutput: true,
  };

  private url = "";
  private accessToken = "";
  private connection: Connection | null = null;
  private unsubEntities: (() => void) | null = null;
  private connectionState: OutputConnectionState = "disconnected";
  private connectionStateListeners = new Set<
    (state: OutputConnectionState) => void
  >();

  // ── Entity management ─────────────────────────────────
  /** All discovered media_player entities */
  private entities: OutputEntity[] = [];
  private entityStates: Partial<Record<string, HAMediaPlayerState>> = {};
  private activeEntityId: string | null = null;
  private entityListeners = new Set<(entities: OutputEntity[]) => void>();

  // ── Playback state ────────────────────────────────────
  private playbackStateListeners = new Set<(state: PlaybackState) => void>();
  private lastNotifiedState: PlaybackState = { isPlaying: false, positionMs: 0, durationMs: 0 };
  private positionInterval: ReturnType<typeof setInterval> | null = null;

  // ── Reconnection ──────────────────────────────────────
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  configure(config: Record<string, string>): void {
    this.url = config.url || "";
    this.accessToken = config.accessToken || "";
  }

  setActiveEntity(entityId: string | null): void {
    this.activeEntityId = entityId;
    this.notifyPlaybackState();
  }

  getActiveEntityId(): string | null {
    return this.activeEntityId;
  }

  getEntities(): OutputEntity[] {
    return [...this.entities];
  }

  onEntitiesChange(cb: (entities: OutputEntity[]) => void): Unsubscribe {
    this.entityListeners.add(cb);
    return () => this.entityListeners.delete(cb);
  }

  async connect(): Promise<void> {
    if (!this.url || !this.accessToken) {
      warn("HAOutputAdapter: missing config, cannot connect");
      this.setConnectionState("error");
      return;
    }

    this.setConnectionState("connecting");
    this.reconnectAttempts = 0;

    try {
      this.connection = await connectToHA(this.url, this.accessToken);

      // Listen for connection close to trigger reconnect
      this.connection.addEventListener("disconnected", () => {
        if (this.connectionState === "connected") {
          log("HA connection lost, attempting reconnect...");
          this.setConnectionState("error");
          this.scheduleReconnect();
        }
      });

      // Subscribe to all entity state changes
      this.unsubEntities = subscribeToAllEntities(
        this.connection,
        (entities, raw) => {
          // Guard: only notify if the entity list actually changed
          const changed =
            entities.length !== this.entities.length ||
            entities.some(
              (e, i) =>
                e.entityId !== this.entities[i]?.entityId ||
                e.state !== this.entities[i]?.state,
            );
          this.entityStates = raw;
          if (changed) {
            this.entities = entities;
            this.entityListeners.forEach((cb) => cb([...entities]));
          }
          if (this.activeEntityId) {
            this.notifyPlaybackState();
          }
        },
      );

      // Start position interpolation polling
      this.startPositionPolling();

      this.setConnectionState("connected");
      log("HAOutputAdapter connected:", this.url);
    } catch (e) {
      logError("HAOutputAdapter connect failed:", e);
      this.setConnectionState("error");
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    await Promise.resolve();
    this.stopPositionPolling();
    this.cancelReconnect();

    this.unsubEntities?.();
    this.unsubEntities = null;

    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    this.entities = [];
    this.entityStates = {};
    this.setConnectionState("disconnected");
    log("HAOutputAdapter disconnected");
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
    if (!this.connection || !this.activeEntityId) {
      warn("HAOutputAdapter: not connected or no active entity");
      return;
    }
    await playMedia(
      this.connection,
      this.activeEntityId,
      streamUrl,
      `${track.title} — ${track.artistName}`,
      track.artworkUrl,
    );
  }

  async pause(): Promise<void> {
    if (!this.connection || !this.activeEntityId) return;
    await pauseMedia(this.connection, this.activeEntityId);
  }

  async resume(): Promise<void> {
    if (!this.connection || !this.activeEntityId) return;
    await resumeMedia(this.connection, this.activeEntityId);
  }

  async stop(): Promise<void> {
    if (!this.connection || !this.activeEntityId) return;
    try {
      await stopMedia(this.connection, this.activeEntityId);
    } catch {
      // Entity may already be idle
    }
  }

  async seek(positionMs: number): Promise<void> {
    if (!this.connection || !this.activeEntityId) return;
    await seekMedia(this.connection, this.activeEntityId, positionMs / 1000);
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.connection || !this.activeEntityId) return;
    await setVolumeLevel(this.connection, this.activeEntityId, volume);
  }

  getPlaybackState(): PlaybackState {
    if (!this.activeEntityId) {
      return { isPlaying: false, positionMs: 0, durationMs: 0 };
    }

    const entityState = this.entityStates[this.activeEntityId];
    if (!entityState) {
      return { isPlaying: false, positionMs: 0, durationMs: 0 };
    }

    const positionSeconds = interpolatePosition(entityState);
    return {
      isPlaying: entityState.state === "playing",
      positionMs: positionSeconds * 1000,
      durationMs: (entityState.attributes.media_duration ?? 0) * 1000,
    };
  }

  onPlaybackStateChange(cb: (state: PlaybackState) => void): Unsubscribe {
    this.playbackStateListeners.add(cb);
    return () => this.playbackStateListeners.delete(cb);
  }

  // ── Private ─────────────────────────────────────────────

  private setConnectionState(state: OutputConnectionState): void {
    this.connectionState = state;
    this.connectionStateListeners.forEach((cb) => cb(state));
  }

  private notifyPlaybackState(): void {
    const state = this.getPlaybackState();
    const prev = this.lastNotifiedState;
    // Skip if nothing meaningful changed (position rounded to 500ms)
    if (
      state.isPlaying === prev.isPlaying &&
      state.durationMs === prev.durationMs &&
      Math.abs(state.positionMs - prev.positionMs) < 500
    ) {
      return;
    }
    this.lastNotifiedState = state;
    this.playbackStateListeners.forEach((cb) => cb(state));
  }

  private startPositionPolling(): void {
    this.stopPositionPolling();
    this.positionInterval = setInterval(() => {
      if (this.activeEntityId) {
        const entityState = this.entityStates[this.activeEntityId];
        if (entityState?.state === "playing") {
          this.notifyPlaybackState();
        }
      }
    }, POSITION_POLL_INTERVAL);
  }

  private stopPositionPolling(): void {
    if (this.positionInterval) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      warn("HAOutputAdapter: max reconnect attempts reached");
      this.setConnectionState("error");
      return;
    }

    const delay =
      RECONNECT_DELAYS[
        Math.min(this.reconnectAttempts, RECONNECT_DELAYS.length - 1)
      ];
    this.reconnectAttempts++;

    log(`HAOutputAdapter: reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      void this.connect().catch((e: unknown) => {
        warn("HAOutputAdapter: reconnect failed:", e);
        this.scheduleReconnect();
      });
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }
}
