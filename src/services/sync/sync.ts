import { EventEmitter } from "@/src/utils/utils.event-emitter";

import { stableId } from "@/src/shared/lib/ids";

import type { SourceRow } from "../database/database.schemas";
import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";
import { SourcesService } from "../sources/sources";

// ── Types ─────────────────────────────────────────────

type SyncPhase = 'artists' | 'albums' | 'tracks' | 'shows' | 'episodes' | 'audiobooks';

type SyncProgress = {
  sourceId: string;
  phase: SyncPhase;
  count: number;
};

type SyncResult = {
  sourceId: string;
  artists: number;
  albums: number;
  tracks: number;
  shows: number;
  episodes: number;
  audiobooks: number;
};

type SyncServiceEvents = {
  syncStarted: (sourceId: string) => void;
  syncProgress: (progress: SyncProgress) => void;
  syncCompleted: (result: SyncResult) => void;
  syncFailed: (sourceId: string, error: Error) => void;
};

// ── Service ───────────────────────────────────────────

class SyncService extends EventEmitter<SyncServiceEvents> {
  #services: Services;
  #active = new Set<string>();

  constructor(services: Services) {
    super();
    this.#services = services;
  }

  #db = async () => {
    const databaseService = this.#services.get(DatabaseService);
    return databaseService.getInstance();
  };

  public isSyncing = (sourceId?: string): boolean => {
    if (sourceId) return this.#active.has(sourceId);
    return this.#active.size > 0;
  };

  public syncSource = async (source: SourceRow): Promise<SyncResult> => {
    if (this.#active.has(source.id)) {
      throw new Error(`Sync already in progress for source "${source.id}"`);
    }

    this.#active.add(source.id);
    this.emit('syncStarted', source.id);

    try {
      const result = await this.#run(source);
      this.emit('syncCompleted', result);
      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.emit('syncFailed', source.id, error);
      throw error;
    } finally {
      this.#active.delete(source.id);
    }
  };

  public syncAll = async (sources: SourceRow[]): Promise<SyncResult[]> => {
    const results: SyncResult[] = [];
    for (const source of sources) {
      const result = await this.syncSource(source);
      results.push(result);
    }
    return results;
  };

  #run = async (source: SourceRow): Promise<SyncResult> => {
    const sourcesService = this.#services.get(SourcesService);
    const adapter = sourcesService.getAdapter(source);
    const db = await this.#db();
    const now = new Date().toISOString();
    const sid = source.id;

    const progress = (phase: SyncPhase, count: number) => {
      this.emit('syncProgress', { sourceId: sid, phase, count });
    };

    // ── Artists ──────────────────────────────────────
    const remoteArtists = await adapter.getArtists();
    for (const a of remoteArtists) {
      const id = stableId(sid, a.sourceItemId);
      await db.sql`
        INSERT OR REPLACE INTO artists (id, source_id, source_item_id, name, artwork_source_item_id, synced_at)
        VALUES (${id}, ${sid}, ${a.sourceItemId}, ${a.name}, ${a.artworkSourceItemId ?? null}, ${now})
      `;
    }
    progress('artists', remoteArtists.length);

    // ── Albums ──────────────────────────────────────
    const remoteAlbums = await adapter.getAlbums();
    for (const a of remoteAlbums) {
      const id = stableId(sid, a.sourceItemId);
      await db.sql`
        INSERT OR REPLACE INTO albums (id, source_id, source_item_id, title, artist_name, year, artwork_source_item_id, track_count, synced_at)
        VALUES (${id}, ${sid}, ${a.sourceItemId}, ${a.title}, ${a.artistName}, ${a.year ?? null}, ${a.artworkSourceItemId ?? null}, ${a.trackCount ?? null}, ${now})
      `;
    }
    progress('albums', remoteAlbums.length);

    // ── Tracks ──────────────────────────────────────
    const remoteTracks = await adapter.getTracks();
    for (const t of remoteTracks) {
      const id = stableId(sid, t.sourceItemId);
      const albumId = t.albumSourceItemId ? stableId(sid, t.albumSourceItemId) : null;
      await db.sql`
        INSERT OR REPLACE INTO tracks (id, source_id, source_item_id, title, artist_name, album_title, album_id, duration, track_number, disc_number, is_favourite, artwork_source_item_id, synced_at)
        VALUES (${id}, ${sid}, ${t.sourceItemId}, ${t.title}, ${t.artistName}, ${t.albumTitle}, ${albumId}, ${t.duration}, ${t.trackNumber ?? null}, ${t.discNumber ?? null}, ${t.isFavourite ? 1 : 0}, ${t.artworkSourceItemId ?? null}, ${now})
      `;
    }
    progress('tracks', remoteTracks.length);

    // ── Shows ───────────────────────────────────────
    const remoteShows = await adapter.getShows();
    for (const s of remoteShows) {
      const id = stableId(sid, s.sourceItemId);
      await db.sql`
        INSERT OR REPLACE INTO shows (id, source_id, source_item_id, title, author_name, description, artwork_source_item_id, episode_count, synced_at)
        VALUES (${id}, ${sid}, ${s.sourceItemId}, ${s.title}, ${s.authorName ?? null}, ${s.description ?? null}, ${s.artworkSourceItemId ?? null}, ${s.episodeCount ?? null}, ${now})
      `;
    }
    progress('shows', remoteShows.length);

    // ── Episodes ────────────────────────────────────
    const remoteEpisodes = await adapter.getEpisodes();
    for (const e of remoteEpisodes) {
      const id = stableId(sid, e.sourceItemId);
      const showId = stableId(sid, e.showSourceItemId);
      await db.sql`
        INSERT OR REPLACE INTO episodes (id, source_id, source_item_id, show_id, title, description, duration, published_at, episode_number, season_number, content_url, artwork_source_item_id, synced_at)
        VALUES (${id}, ${sid}, ${e.sourceItemId}, ${showId}, ${e.title}, ${e.description ?? null}, ${e.duration}, ${e.publishedAt ?? null}, ${e.episodeNumber ?? null}, ${e.seasonNumber ?? null}, ${e.contentUrl ?? null}, ${e.artworkSourceItemId ?? null}, ${now})
      `;
    }
    progress('episodes', remoteEpisodes.length);

    // ── Audiobooks ──────────────────────────────────
    const remoteAudiobooks = await adapter.getAudiobooks();
    for (const a of remoteAudiobooks) {
      const id = stableId(sid, a.sourceItemId);
      const chapters = a.chapters ? JSON.stringify(a.chapters) : null;
      await db.sql`
        INSERT OR REPLACE INTO audiobooks (id, source_id, source_item_id, title, author_name, narrator_name, description, duration, artwork_source_item_id, chapters, synced_at)
        VALUES (${id}, ${sid}, ${a.sourceItemId}, ${a.title}, ${a.authorName}, ${a.narratorName ?? null}, ${a.description ?? null}, ${a.duration}, ${a.artworkSourceItemId ?? null}, ${chapters}, ${now})
      `;
    }
    progress('audiobooks', remoteAudiobooks.length);

    // ── Update source last sync time ────────────────
    await sourcesService.update(source.id, { lastSyncedAt: now });

    await db.save();

    return {
      sourceId: sid,
      artists: remoteArtists.length,
      albums: remoteAlbums.length,
      tracks: remoteTracks.length,
      shows: remoteShows.length,
      episodes: remoteEpisodes.length,
      audiobooks: remoteAudiobooks.length,
    };
  };
}

export type { SyncProgress, SyncResult, SyncServiceEvents };
export { SyncService };
