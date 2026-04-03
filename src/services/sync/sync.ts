import { EventEmitter } from "@/src/utils/utils.event-emitter";

import { stableId } from "@/src/shared/lib/ids";

import type { SourceRow } from "../database/database.schemas";
import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";
import { SourcesService } from "../sources/sources";
import { ArtworkService } from "../artwork/artwork";

import type { SyncPhase, SyncProgress, SyncResult, SyncServiceEvents } from "./sync.types";

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

  public getStats = async () => {
    const db = await this.#db();
    type CountRow = { count: number };

    const [artists, albums, tracks, shows, episodes, audiobooks] = await Promise.all([
      db.sql<CountRow>`SELECT COUNT(*) as count FROM artists`.first(),
      db.sql<CountRow>`SELECT COUNT(*) as count FROM albums`.first(),
      db.sql<CountRow>`SELECT COUNT(*) as count FROM tracks`.first(),
      db.sql<CountRow>`SELECT COUNT(*) as count FROM shows`.first(),
      db.sql<CountRow>`SELECT COUNT(*) as count FROM episodes`.first(),
      db.sql<CountRow>`SELECT COUNT(*) as count FROM audiobooks`.first(),
    ]);

    return {
      artists: artists?.count ?? 0,
      albums: albums?.count ?? 0,
      tracks: tracks?.count ?? 0,
      shows: shows?.count ?? 0,
      episodes: episodes?.count ?? 0,
      audiobooks: audiobooks?.count ?? 0,
    };
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
        INSERT OR REPLACE INTO artists (id, sourceId, sourceItemId, name, artworkSourceItemId, syncedAt)
        VALUES (${id}, ${sid}, ${a.sourceItemId}, ${a.name}, ${a.artworkSourceItemId ?? null}, ${now})
      `;
    }
    progress('artists', remoteArtists.length);

    // ── Albums ──────────────────────────────────────
    const remoteAlbums = await adapter.getAlbums();
    for (const a of remoteAlbums) {
      const id = stableId(sid, a.sourceItemId);
      await db.sql`
        INSERT OR REPLACE INTO albums (id, sourceId, sourceItemId, title, artistName, year, artworkSourceItemId, trackCount, syncedAt)
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
        INSERT OR REPLACE INTO tracks (id, sourceId, sourceItemId, title, artistName, albumTitle, albumId, duration, trackNumber, discNumber, isFavourite, artworkSourceItemId, syncedAt)
        VALUES (${id}, ${sid}, ${t.sourceItemId}, ${t.title}, ${t.artistName}, ${t.albumTitle}, ${albumId}, ${t.duration}, ${t.trackNumber ?? null}, ${t.discNumber ?? null}, ${t.isFavourite ? 1 : 0}, ${t.artworkSourceItemId ?? null}, ${now})
      `;
    }
    progress('tracks', remoteTracks.length);

    // ── Shows ───────────────────────────────────────
    const remoteShows = await adapter.getShows();
    for (const s of remoteShows) {
      const id = stableId(sid, s.sourceItemId);
      await db.sql`
        INSERT OR REPLACE INTO shows (id, sourceId, sourceItemId, title, authorName, description, artworkSourceItemId, episodeCount, syncedAt)
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
        INSERT OR REPLACE INTO episodes (id, sourceId, sourceItemId, showId, title, description, duration, publishedAt, episodeNumber, seasonNumber, contentUrl, artworkSourceItemId, syncedAt)
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
        INSERT OR REPLACE INTO audiobooks (id, sourceId, sourceItemId, title, authorName, narratorName, description, duration, artworkSourceItemId, chapters, syncedAt)
        VALUES (${id}, ${sid}, ${a.sourceItemId}, ${a.title}, ${a.authorName}, ${a.narratorName ?? null}, ${a.description ?? null}, ${a.duration}, ${a.artworkSourceItemId ?? null}, ${chapters}, ${now})
      `;
    }
    progress('audiobooks', remoteAudiobooks.length);

    // ── Artwork ─────────────────────────────────────
    const artworkItems = new Map<string, string>();
    const collect = (itemId: string | null | undefined) => {
      if (itemId && !artworkItems.has(itemId)) {
        artworkItems.set(itemId, adapter.getArtworkUrl(itemId, 'medium'));
      }
    };

    for (const a of remoteArtists) collect(a.artworkSourceItemId);
    for (const a of remoteAlbums) collect(a.artworkSourceItemId);
    for (const s of remoteShows) collect(s.artworkSourceItemId);
    for (const a of remoteAudiobooks) collect(a.artworkSourceItemId);

    const artworkService = this.#services.get(ArtworkService);
    let artworkCount = 0;
    for (const [itemId, url] of artworkItems) {
      await artworkService.download(url, sid, itemId, 'medium');
      artworkCount++;
    }
    progress('artwork', artworkCount);

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
