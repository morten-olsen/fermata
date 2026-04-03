import { EventEmitter } from "@/src/utils/utils.event-emitter";

import { log, warn } from "@/src/shared/lib/log";

import { DatabaseService } from "../database/database.service";
import { DownloadService } from "../downloads/downloads";
import { FileSystemService } from "../filesystem/filesystem";
import { SourcesService } from "../sources/sources";
import type { Services } from "../services/services";
import type { TrackRow, EpisodeRow, AudiobookRow } from "../database/database.schemas";

import type { PlaybackPlayer } from "./playback.player";
import { trackRowToQueueItem, episodeRowToQueueItem, audiobookRowToQueueItem } from "./playback.schemas";
import type {
  PlaybackServiceEvents,
  PlaybackState,
  QueueItem,
  ReconcilePayload,
  ResolvedQueueItem,
  TrackMetadata,
} from "./playback.types";


/** Threshold: consider a track completed when within 30s of the end */
const COMPLETION_THRESHOLD_MS = 30_000;
/** Skip progress writes when position hasn't moved significantly */
const POSITION_CHANGE_THRESHOLD_MS = 5_000;
/** Periodic progress save interval */
const PROGRESS_INTERVAL_MS = 30_000;

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class PlaybackService extends EventEmitter<PlaybackServiceEvents> {
  #services: Services;
  #player: PlaybackPlayer | null = null;
  #playerUnsubs: Array<() => void> = [];

  // ── State ───────────────────────────────────────────
  #queue: QueueItem[] = [];
  #currentIndex = -1;
  #status: PlaybackState['status'] = 'idle';
  #positionMs = 0;
  #durationMs = 0;
  #volume = 1;

  // ── Progress tracking ───────────────────────────────
  #lastSavedTrackId = '';
  #lastSavedPositionMs = 0;
  #wasPlaying = false;
  #progressInterval: ReturnType<typeof setInterval> | null = null;

  constructor(services: Services) {
    super();
    this.#services = services;
  }

  #db = async () => {
    const databaseService = this.#services.get(DatabaseService);
    return databaseService.getInstance();
  };

  // ── Player management ───────────────────────────────

  public setPlayer = (player: PlaybackPlayer | null) => {
    // Unsubscribe from old player
    for (const unsub of this.#playerUnsubs) unsub();
    this.#playerUnsubs = [];

    this.#player = player;

    if (player) {
      this.#subscribeToPlayer(player);
      // Auto-reconcile if we have something playing
      if (this.#currentIndex >= 0 && this.#queue.length > 0) {
        void this.#reconcile();
      }
    }
  };

  // ── Getters ─────────────────────────────────────────

  public getCurrentTrack = (): QueueItem | null =>
    this.#currentIndex >= 0 ? this.#queue[this.#currentIndex] ?? null : null;

  public getQueue = (): QueueItem[] => [...this.#queue];

  public getState = (): PlaybackState => ({
    queue: [...this.#queue],
    currentIndex: this.#currentIndex,
    currentTrack: this.getCurrentTrack(),
    status: this.#status,
    positionMs: this.#positionMs,
    durationMs: this.#durationMs,
    volume: this.#volume,
  });

  // ── Playback actions ────────────────────────────────

  public playTrack = async (trackId: string) => {
    this.#saveCurrentTrackProgress();
    const db = await this.#db();
    const row = await db.sql<TrackRow>`SELECT * FROM tracks WHERE id = ${trackId}`.first();
    if (!row) { warn("playTrack: track not found:", trackId); return; }

    this.#queue = [trackRowToQueueItem(row)];
    this.#currentIndex = 0;
    this.#positionMs = 0;
    this.emit('queueChanged');
    await this.#reconcile();
  };

  public playAlbum = async (albumId: string, startIndex = 0) => {
    this.#saveCurrentTrackProgress();
    const db = await this.#db();
    const rows = await db.sql<TrackRow>`
      SELECT * FROM tracks WHERE albumId = ${albumId}
      ORDER BY discNumber ASC, trackNumber ASC
    `;
    if (rows.length === 0) { warn("playAlbum: no tracks for album:", albumId); return; }

    this.#queue = rows.map(trackRowToQueueItem);
    this.#currentIndex = Math.min(startIndex, rows.length - 1);
    this.#positionMs = 0;
    this.emit('queueChanged');
    await this.#reconcile();
  };

  public shuffleAlbum = async (albumId: string) => {
    this.#saveCurrentTrackProgress();
    const db = await this.#db();
    const rows = await db.sql<TrackRow>`
      SELECT * FROM tracks WHERE albumId = ${albumId}
      ORDER BY discNumber ASC, trackNumber ASC
    `;
    if (rows.length === 0) return;

    this.#queue = shuffle(rows.map(trackRowToQueueItem));
    this.#currentIndex = 0;
    this.#positionMs = 0;
    this.emit('queueChanged');
    await this.#reconcile();
  };

  public playTracks = async (trackIds: string[], startIndex = 0) => {
    this.#saveCurrentTrackProgress();
    const db = await this.#db();

    const items: QueueItem[] = [];
    for (const id of trackIds) {
      // Try tracks first, then episodes, then audiobooks
      const track = await db.sql<TrackRow>`SELECT * FROM tracks WHERE id = ${id}`.first();
      if (track) { items.push(trackRowToQueueItem(track)); continue; }

      const episode = await db.sql<EpisodeRow>`SELECT * FROM episodes WHERE id = ${id}`.first();
      if (episode) { items.push(episodeRowToQueueItem(episode)); continue; }

      const audiobook = await db.sql<AudiobookRow>`SELECT * FROM audiobooks WHERE id = ${id}`.first();
      if (audiobook) { items.push(audiobookRowToQueueItem(audiobook)); continue; }
    }
    if (items.length === 0) return;

    this.#queue = items;
    this.#currentIndex = Math.min(startIndex, items.length - 1);
    this.#positionMs = 0;
    this.emit('queueChanged');
    await this.#reconcile();
  };

  public togglePlayPause = async () => {
    if (!this.#player) return;
    if (this.#status === 'playing') {
      await this.#player.pause();
    } else {
      await this.#player.resume();
    }
  };

  public skipNext = async () => {
    if (this.#currentIndex + 1 >= this.#queue.length) return;
    this.#saveCurrentTrackProgress();
    this.#currentIndex++;
    this.#positionMs = 0;
    this.emit('queueChanged');
    await this.#skipOrReconcile();
  };

  public skipPrevious = async () => {
    const current = this.getCurrentTrack();
    // If past 3s, restart current track (seek to chapter start)
    if (this.#positionMs > 3000) {
      await this.#player?.seek(current?.chapterStartMs ?? 0);
      return;
    }

    if (this.#currentIndex <= 0) {
      await this.#player?.seek(current?.chapterStartMs ?? 0);
      return;
    }

    this.#saveCurrentTrackProgress();
    this.#currentIndex--;
    this.#positionMs = 0;
    this.emit('queueChanged');
    await this.#skipOrReconcile();
  };

  public skipToIndex = async (index: number) => {
    if (index < 0 || index >= this.#queue.length) return;
    this.#saveCurrentTrackProgress();
    this.#currentIndex = index;
    this.#positionMs = 0;
    this.emit('queueChanged');
    await this.#skipOrReconcile();
  };

  public seekTo = async (positionMs: number) => {
    if (!this.#player) return;
    const current = this.getCurrentTrack();
    const offsetMs = current?.chapterStartMs ?? 0;
    await this.#player.seek(positionMs + offsetMs);
  };

  public setVolume = async (volume: number) => {
    this.#volume = volume;
    this.emit('stateChanged');
    await this.#player?.setVolume(volume);
  };

  // ── Private: skip or reconcile ──────────────────────

  /**
   * For queue-capable players, use native skip (no queue reload).
   * For single-track players (HA), resolve the URL and reconcile.
   */
  #skipOrReconcile = async () => {
    if (!this.#player) return;

    const current = this.getCurrentTrack();
    this.emit('trackChanged', current);

    if (this.#player.handlesQueue) {
      // Player owns the queue — just skip within it
      const seekMs = current?.tracksProgress ? await this.#getResumePosition(current.id) : 0;
      const offsetMs = current?.chapterStartMs ?? 0;
      await this.#player.skipTo(this.#currentIndex, seekMs + offsetMs);
      this.emit('stateChanged');
    } else {
      // Player has no queue — full reconcile with single item
      await this.#reconcile();
    }
  };

  // ── Private: reconcile ──────────────────────────────

  #reconcile = async () => {
    if (!this.#player || this.#queue.length === 0 || this.#currentIndex < 0) return;

    this.#status = 'loading';
    this.emit('stateChanged');

    const current = this.getCurrentTrack();
    this.emit('trackChanged', current);

    try {
      // Resolve all queue items to stream URLs
      const resolved = await this.#resolveQueue();
      if (resolved.length === 0) {
        warn("reconcile: no items could be resolved");
        this.#status = 'error';
        this.emit('stateChanged');
        return;
      }

      // Get resume position for podcast/audiobook
      let seekMs = this.#positionMs;
      if (seekMs === 0 && current?.tracksProgress) {
        seekMs = await this.#getResumePosition(current.id);
      }

      // Add chapter offset
      const offsetMs = current?.chapterStartMs ?? 0;

      const payload: ReconcilePayload = {
        queue: resolved,
        currentIndex: this.#currentIndex,
        positionMs: seekMs + offsetMs,
        volume: this.#volume,
      };

      await this.#player.reconcile(payload);
      this.#status = 'playing';
      this.#startProgressInterval();
      this.emit('stateChanged');
    } catch (e) {
      warn("reconcile failed:", e);
      this.#status = 'error';
      this.emit('stateChanged');
    }
  };

  #resolveQueue = async (): Promise<ResolvedQueueItem[]> => {
    const results: ResolvedQueueItem[] = [];
    for (const item of this.#queue) {
      const resolved = await this.#resolveStreamUrl(item);
      if (resolved) results.push(resolved);
    }
    return results;
  };

  #resolveStreamUrl = async (item: QueueItem): Promise<ResolvedQueueItem | null> => {
    const sourcesService = this.#services.get(SourcesService);
    const downloadService = this.#services.get(DownloadService);

    const source = await sourcesService.findById(item.sourceId);
    const adapter = source ? sourcesService.getAdapter(source) : null;

    const metadata: TrackMetadata = {
      trackId: item.id,
      title: item.title,
      artistName: item.artistName,
      albumTitle: item.albumTitle,
      artworkUrl: item.artworkUri ?? undefined,
      durationMs: item.duration * 1000,
      headers: adapter?.getStreamHeaders?.(),
    };

    // Prefer local downloaded file — use getPlayableUrl for a fresh URL
    // (on web, cached blob URLs from the DB are stale after page reload)
    if (downloadService.isDownloaded(item.id, item.type)) {
      const fs = this.#services.get(FileSystemService);
      const playableUrl = await fs.getPlayableUrl('downloads', 'audio', `${item.id}.${item.type}`);
      if (playableUrl) {
        return { streamUrl: playableUrl, metadata };
      }
    }

    if (!adapter) {
      warn("resolveStreamUrl: no adapter for source:", item.sourceId);
      return null;
    }

    try {
      const streamUrl = await adapter.getStreamUrl(item.sourceItemId, item.contentUrl);
      return { streamUrl, metadata };
    } catch (e) {
      warn("resolveStreamUrl: failed for", item.title, e);
      return null;
    }
  };

  // ── Private: player event subscription ──────────────

  #subscribeToPlayer = (player: PlaybackPlayer) => {
    const unsubs: Array<() => void> = [];

    unsubs.push(player.on('progress', (positionMs, durationMs) => {
      const current = this.getCurrentTrack();
      const offsetMs = current?.chapterStartMs ?? 0;
      this.#positionMs = Math.max(0, positionMs - offsetMs);
      this.#durationMs = current ? current.duration * 1000 : durationMs;
      this.emit('stateChanged');
    }));

    unsubs.push(player.on('stateChanged', (isPlaying) => {
      const prevStatus = this.#status;
      this.#status = isPlaying ? 'playing' : 'paused';

      // Record progress on pause transition
      if (this.#wasPlaying && !isPlaying && this.#positionMs > 0) {
        this.#saveCurrentTrackProgress();
      }

      // Manage progress interval
      if (isPlaying && !this.#wasPlaying) {
        this.#startProgressInterval();
      } else if (!isPlaying && this.#wasPlaying) {
        this.#stopProgressInterval();
      }

      this.#wasPlaying = isPlaying;

      if (this.#status !== prevStatus) {
        this.emit('stateChanged');
      }
    }));

    unsubs.push(player.on('trackEnded', () => {
      this.#saveCurrentTrackProgress();

      // Queue-capable players auto-advance — just sync the service index.
      // Single-track players (HA) don't emit trackEnded.
      if (this.#currentIndex + 1 < this.#queue.length) {
        this.#currentIndex++;
        this.#positionMs = 0;
        this.emit('queueChanged');
        this.emit('trackChanged', this.getCurrentTrack());
        this.emit('stateChanged');
      } else {
        // Queue finished
        this.#status = 'idle';
        this.#stopProgressInterval();
        this.emit('stateChanged');
      }
    }));

    unsubs.push(player.on('error', (error) => {
      warn("Player error:", error.message);
      this.#status = 'error';
      this.emit('stateChanged');
    }));

    this.#playerUnsubs = unsubs;
  };

  // ── Private: progress tracking ──────────────────────

  #saveCurrentTrackProgress = () => {
    const current = this.getCurrentTrack();
    if (!current?.tracksProgress || this.#positionMs <= 0) return;

    const durationMs = current.duration * 1000;

    // Skip if position hasn't moved enough
    if (
      current.id === this.#lastSavedTrackId &&
      Math.abs(this.#positionMs - this.#lastSavedPositionMs) < POSITION_CHANGE_THRESHOLD_MS
    ) {
      return;
    }

    const isCompleted = durationMs > 0 && this.#positionMs >= durationMs - COMPLETION_THRESHOLD_MS;

    this.#lastSavedTrackId = current.id;
    this.#lastSavedPositionMs = this.#positionMs;

    void this.#writeProgress(current.id, current.type, this.#positionMs, durationMs, isCompleted);
  };

  #writeProgress = async (
    itemId: string,
    itemType: string,
    positionMs: number,
    durationMs: number,
    isCompleted: boolean,
  ) => {
    const db = await this.#db();
    const now = new Date().toISOString();
    await db.sql`
      INSERT INTO playbackProgress (itemId, itemType, positionMs, durationMs, isCompleted, updatedAt, needsSync)
      VALUES (${itemId}, ${itemType}, ${positionMs}, ${durationMs}, ${isCompleted ? 1 : 0}, ${now}, 1)
      ON CONFLICT (itemId, itemType) DO UPDATE SET
        positionMs = ${positionMs},
        durationMs = ${durationMs},
        isCompleted = ${isCompleted ? 1 : 0},
        updatedAt = ${now},
        needsSync = 1
    `;
    await db.save();
    log("Progress saved:", itemId, `${Math.round(positionMs / 1000)}s`, isCompleted ? "(completed)" : "");
  };

  #getResumePosition = async (itemId: string): Promise<number> => {
    const db = await this.#db();
    type Row = { positionMs: number; isCompleted: number };
    const row = await db.sql<Row>`
      SELECT positionMs, isCompleted FROM playbackProgress
      WHERE itemId = ${itemId}
    `.first();
    if (!row || row.isCompleted) return 0;
    return row.positionMs;
  };

  #startProgressInterval = () => {
    this.#stopProgressInterval();
    this.#progressInterval = setInterval(() => {
      this.#saveCurrentTrackProgress();
    }, PROGRESS_INTERVAL_MS);
  };

  #stopProgressInterval = () => {
    if (this.#progressInterval) {
      clearInterval(this.#progressInterval);
      this.#progressInterval = null;
    }
  };
}

export { PlaybackService };
