// ── Track metadata for players ────────────────────────

type TrackMetadata = {
  trackId: string;
  title: string;
  artistName: string;
  albumTitle: string;
  artworkUrl?: string;
  durationMs: number;
  headers?: Record<string, string>;
};

// ── Resolved queue item (ready for player) ────────────

type ResolvedQueueItem = {
  streamUrl: string;
  metadata: TrackMetadata;
};

// ── Reconcile payload (full snapshot for player) ──────

type ReconcilePayload = {
  queue: ResolvedQueueItem[];
  currentIndex: number;
  positionMs: number;
  volume: number;
};

// ── Playback status ───────────────────────────────────

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

// ── Queue item (in-memory, service-level) ─────────────

type QueueItemType = 'track' | 'episode' | 'audiobook';

type QueueItem = {
  id: string;
  type: QueueItemType;
  title: string;
  artistName: string;
  albumTitle: string;
  duration: number;
  sourceId: string;
  sourceItemId: string;
  contentUrl?: string | null;
  artworkSourceItemId?: string | null;
  artworkUri?: string | null;
  chapterStartMs?: number | null;
  tracksProgress: boolean;
};

// ── Player events ─────────────────────────────────────

type PlaybackPlayerEvents = {
  progress: (positionMs: number, durationMs: number) => void;
  trackEnded: () => void;
  error: (error: Error) => void;
  stateChanged: (isPlaying: boolean) => void;
};

// ── Service events ────────────────────────────────────

type PlaybackServiceEvents = {
  stateChanged: () => void;
  queueChanged: () => void;
  trackChanged: (track: QueueItem | null) => void;
};

// ── Service state snapshot ────────────────────────────

type PlaybackState = {
  queue: QueueItem[];
  currentIndex: number;
  currentTrack: QueueItem | null;
  status: PlaybackStatus;
  positionMs: number;
  durationMs: number;
  volume: number;
};

export type {
  TrackMetadata,
  ResolvedQueueItem,
  ReconcilePayload,
  PlaybackStatus,
  QueueItemType,
  QueueItem,
  PlaybackPlayerEvents,
  PlaybackServiceEvents,
  PlaybackState,
};
