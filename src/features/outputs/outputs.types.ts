export type Unsubscribe = () => void;

export interface PlaybackState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  trackId?: string;
}

export interface OutputAdapterCapabilities {
  canStreamFromUrl: boolean;
  canPlayLocalFiles: boolean;
  canSeek: boolean;
  canSetVolume: boolean;
  canReportPosition: boolean;
  canQueue: boolean;
  /** Adapter is network-based (higher latency for seek, needs lifecycle mgmt) */
  isNetworkOutput: boolean;
}

/** Entity exposed by adapters that manage multiple speakers (e.g. HA) */
export interface OutputEntity {
  entityId: string;
  name: string;
  state: string;
}

export type OutputConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/** Metadata passed to the adapter for display on the target device */
export interface OutputTrackMetadata {
  trackId: string;
  title: string;
  artistName: string;
  albumTitle: string;
  artworkUrl?: string;
  durationMs: number;
}

export interface OutputAdapter {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly capabilities: OutputAdapterCapabilities;

  // ── Connection lifecycle ──────────────────────────────────
  /** Establish connection to the output device. May fail for network outputs. */
  connect(): Promise<void>;
  /** Gracefully close the connection. Idempotent. */
  disconnect(): Promise<void>;
  /** Current connection state */
  getConnectionState(): OutputConnectionState;
  /** Subscribe to connection state changes */
  onConnectionStateChange(
    cb: (state: OutputConnectionState) => void,
  ): Unsubscribe;

  // ── Transport ─────────────────────────────────────────────
  /** Start playing a track. streamUrl may be a remote URL or local file URI. */
  play(streamUrl: string, track: OutputTrackMetadata): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;

  // ── Queue (optional — only for adapters with canQueue) ────
  /** Load multiple tracks. Adapter may ignore if canQueue is false. */
  loadQueue?(
    tracks: Array<{ streamUrl: string; metadata: OutputTrackMetadata }>,
    startIndex?: number,
  ): Promise<void>;
  /** Skip to a specific index in the loaded queue */
  skipToIndex?(index: number): Promise<void>;

  // ── State observation ─────────────────────────────────────
  getPlaybackState(): PlaybackState;
  onPlaybackStateChange(cb: (state: PlaybackState) => void): Unsubscribe;

  // ── Multi-entity (optional — for adapters managing multiple speakers) ──
  configure?(config: Record<string, string>): void;
  setActiveEntity?(entityId: string | null): void;
  getActiveEntityId?(): string | null;
  getEntities?(): OutputEntity[];
  onEntitiesChange?(cb: (entities: OutputEntity[]) => void): Unsubscribe;

  // ── Lock screen (optional — for local adapters providing notification UI) ──
  showNotificationForRemotePlayback?(track: OutputTrackMetadata): Promise<void>;
}

/** Persisted config for an output (stored as JSON in DB) */
export interface OutputPersistedConfig {
  [key: string]: string;
}

export type OutputAdapterConstructor = new (
  id: string,
  name: string,
) => OutputAdapter;
