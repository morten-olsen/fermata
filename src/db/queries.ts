import { eq, like, or, sql, desc, asc, and, exists } from "drizzle-orm";
import { db } from "./client";
import {
  sources,
  artists,
  albums,
  tracks,
  playlists,
  playlistTracks,
  downloads,
} from "./schema";

// ── ID Generation ──────────────────────────────────────

/** Deterministic ID for synced entities — stable across re-syncs */
export function stableId(sourceId: string, sourceItemId: string): string {
  let hash = 0;
  const input = `${sourceId}:${sourceItemId}`;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `${sourceId.slice(0, 8)}-${(hash >>> 0).toString(36)}`;
}

/** Random ID for local-only entities (playlists, etc.) */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Sources ────────────────────────────────────────────

export async function getAllSources() {
  return db.select().from(sources);
}

export async function getSource(id: string) {
  return db.select().from(sources).where(eq(sources.id, id)).get();
}

export async function upsertSource(source: typeof sources.$inferInsert) {
  return db
    .insert(sources)
    .values(source)
    .onConflictDoUpdate({
      target: sources.id,
      set: {
        name: source.name,
        baseUrl: source.baseUrl,
        userId: source.userId,
        accessToken: source.accessToken,
        lastSyncedAt: source.lastSyncedAt,
      },
    });
}

export async function deleteSource(id: string) {
  return db.delete(sources).where(eq(sources.id, id));
}

// ── Artists ────────────────────────────────────────────

export async function getAllArtists(offlineOnly = false) {
  if (offlineOnly) {
    return db
      .select()
      .from(artists)
      .where(
        sql`EXISTS (SELECT 1 FROM tracks t INNER JOIN downloads d ON d.track_id = t.id WHERE t.artist_name = ${artists.name} AND d.status = 'complete')`
      )
      .orderBy(asc(artists.name));
  }
  return db.select().from(artists).orderBy(asc(artists.name));
}

export async function upsertArtists(rows: (typeof artists.$inferInsert)[]) {
  if (rows.length === 0) return;
  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(artists)
        .values(row)
        .onConflictDoUpdate({
          target: artists.id,
          set: {
            name: row.name,
            artworkSourceItemId: row.artworkSourceItemId,
            syncedAt: row.syncedAt,
          },
        });
    }
  });
}

// ── Albums ─────────────────────────────────────────────

export async function getAllAlbums(offlineOnly = false) {
  if (offlineOnly) {
    return db
      .select()
      .from(albums)
      .where(
        sql`EXISTS (SELECT 1 FROM downloads d INNER JOIN tracks t ON d.track_id = t.id WHERE t.album_id = ${albums.id} AND d.status = 'complete')`
      )
      .orderBy(asc(albums.title));
  }
  return db.select().from(albums).orderBy(asc(albums.title));
}

export async function getAlbumsByArtist(artistName: string) {
  return db
    .select()
    .from(albums)
    .where(eq(albums.artistName, artistName))
    .orderBy(desc(albums.year));
}

export async function getAlbum(id: string) {
  return db.select().from(albums).where(eq(albums.id, id)).get();
}

export async function upsertAlbums(rows: (typeof albums.$inferInsert)[]) {
  if (rows.length === 0) return;
  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(albums)
        .values(row)
        .onConflictDoUpdate({
          target: albums.id,
          set: {
            title: row.title,
            artistName: row.artistName,
            year: row.year,
            artworkSourceItemId: row.artworkSourceItemId,
            trackCount: row.trackCount,
            syncedAt: row.syncedAt,
          },
        });
    }
  });
}

// ── Tracks ─────────────────────────────────────────────

const DEFAULT_TRACK_LIMIT = 200;

export async function getTracks(limit = DEFAULT_TRACK_LIMIT, offset = 0, offlineOnly = false) {
  if (offlineOnly) {
    return db
      .select({ tracks })
      .from(tracks)
      .innerJoin(downloads, and(eq(downloads.trackId, tracks.id), eq(downloads.status, sql`'complete'`)))
      .orderBy(asc(tracks.title))
      .limit(limit)
      .offset(offset)
      .then((rows) => rows.map((r) => r.tracks));
  }
  return db
    .select()
    .from(tracks)
    .orderBy(asc(tracks.title))
    .limit(limit)
    .offset(offset);
}

export async function getTracksByAlbum(albumId: string) {
  return db
    .select()
    .from(tracks)
    .where(eq(tracks.albumId, albumId))
    .orderBy(asc(tracks.discNumber), asc(tracks.trackNumber));
}

export async function getTrack(id: string) {
  return db.select().from(tracks).where(eq(tracks.id, id)).get();
}

export async function upsertTracks(rows: (typeof tracks.$inferInsert)[]) {
  if (rows.length === 0) return;
  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(tracks)
        .values(row)
        .onConflictDoUpdate({
          target: tracks.id,
          set: {
            title: row.title,
            artistName: row.artistName,
            albumTitle: row.albumTitle,
            albumId: row.albumId,
            duration: row.duration,
            trackNumber: row.trackNumber,
            discNumber: row.discNumber,
            isFavourite: row.isFavourite,
            syncedAt: row.syncedAt,
          },
        });
    }
  });
}

// ── Favourites ────────────────────────────────────────

export async function setTrackFavourite(id: string, isFavourite: boolean) {
  return db
    .update(tracks)
    .set({ isFavourite: isFavourite ? 1 : 0 })
    .where(eq(tracks.id, id));
}

// ── Search ─────────────────────────────────────────────

export async function searchLibrary(query: string) {
  const pattern = `%${query}%`;

  const [matchedArtists, matchedAlbums, matchedTracks] = await Promise.all([
    db
      .select()
      .from(artists)
      .where(like(artists.name, pattern))
      .orderBy(asc(artists.name))
      .limit(20),
    db
      .select()
      .from(albums)
      .where(or(like(albums.title, pattern), like(albums.artistName, pattern)))
      .orderBy(asc(albums.title))
      .limit(20),
    db
      .select()
      .from(tracks)
      .where(
        or(
          like(tracks.title, pattern),
          like(tracks.artistName, pattern),
          like(tracks.albumTitle, pattern)
        )
      )
      .orderBy(asc(tracks.title))
      .limit(30),
  ]);

  return {
    artists: matchedArtists,
    albums: matchedAlbums,
    tracks: matchedTracks,
  };
}

// ── Playlists ─────────────────────────────────────────

export async function getAllPlaylists() {
  return db.select().from(playlists).orderBy(asc(playlists.name));
}

export async function getAllPlaylistsWithCount() {
  return db
    .select({
      id: playlists.id,
      sourceId: playlists.sourceId,
      sourceItemId: playlists.sourceItemId,
      name: playlists.name,
      description: playlists.description,
      isMixTape: playlists.isMixTape,
      artworkSourceItemId: playlists.artworkSourceItemId,
      needsSync: playlists.needsSync,
      createdAt: playlists.createdAt,
      updatedAt: playlists.updatedAt,
      syncedAt: playlists.syncedAt,
      trackCount: sql<number>`(SELECT count(*) FROM playlist_tracks WHERE playlist_id = ${playlists.id})`,
    })
    .from(playlists)
    .orderBy(asc(playlists.name));
}

export async function getPlaylist(id: string) {
  return db.select().from(playlists).where(eq(playlists.id, id)).get();
}

export async function getPlaylistTracks(playlistId: string) {
  return db
    .select({
      position: playlistTracks.position,
      addedAt: playlistTracks.addedAt,
      track: tracks,
    })
    .from(playlistTracks)
    .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
    .where(eq(playlistTracks.playlistId, playlistId))
    .orderBy(asc(playlistTracks.position));
}

/** Get playlists that have local edits pending push to source */
export async function getPlaylistsNeedingSync(sourceId: string) {
  return db
    .select()
    .from(playlists)
    .where(
      and(eq(playlists.sourceId, sourceId), eq(playlists.needsSync, 1))
    );
}

export async function upsertPlaylists(
  rows: (typeof playlists.$inferInsert)[]
) {
  if (rows.length === 0) return;
  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(playlists)
        .values(row)
        .onConflictDoUpdate({
          target: playlists.id,
          set: {
            name: row.name,
            description: row.description,
            artworkSourceItemId: row.artworkSourceItemId,
            trackCount: row.trackCount,
            syncedAt: row.syncedAt,
            // isMixTape intentionally excluded — preserve user's local pin
            // needsSync intentionally excluded — don't overwrite pending local edits
          },
        });
    }
  });
}

/** Replace all tracks in a playlist (used during sync) */
export async function replacePlaylistTracks(
  playlistId: string,
  rows: (typeof playlistTracks.$inferInsert)[]
) {
  await db.transaction(async (tx) => {
    await tx
      .delete(playlistTracks)
      .where(eq(playlistTracks.playlistId, playlistId));
    for (const row of rows) {
      await tx.insert(playlistTracks).values(row).onConflictDoNothing();
    }
  });
}

export async function createPlaylist(
  name: string,
  sourceId?: string | null,
  sourceItemId?: string | null
): Promise<string> {
  const id =
    sourceId && sourceItemId
      ? stableId(sourceId, sourceItemId)
      : generateId();
  const now = new Date().toISOString();
  await db.insert(playlists).values({
    id,
    sourceId: sourceId ?? null,
    sourceItemId: sourceItemId ?? null,
    name,
    isMixTape: 0,
    trackCount: 0,
    needsSync: 0,
    createdAt: now,
    updatedAt: now,
    syncedAt: sourceId ? now : null,
  });
  return id;
}

export async function deletePlaylist(id: string) {
  return db.delete(playlists).where(eq(playlists.id, id));
}

export async function addTrackToPlaylist(
  playlistId: string,
  trackId: string
) {
  const existing = await db
    .select({
      maxPos: sql<number>`coalesce(max(${playlistTracks.position}), -1)`,
    })
    .from(playlistTracks)
    .where(eq(playlistTracks.playlistId, playlistId))
    .get();

  const nextPosition = (existing?.maxPos ?? -1) + 1;
  const now = new Date().toISOString();

  await db
    .insert(playlistTracks)
    .values({ playlistId, trackId, position: nextPosition, addedAt: now })
    .onConflictDoNothing();

  await db
    .update(playlists)
    .set({ updatedAt: now, needsSync: 1 })
    .where(eq(playlists.id, playlistId));
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string
) {
  await db.transaction(async (tx) => {
    await tx
      .delete(playlistTracks)
      .where(
        and(
          eq(playlistTracks.playlistId, playlistId),
          eq(playlistTracks.trackId, trackId)
        )
      );

    // Renumber remaining positions
    const remaining = await tx
      .select({ trackId: playlistTracks.trackId })
      .from(playlistTracks)
      .where(eq(playlistTracks.playlistId, playlistId))
      .orderBy(asc(playlistTracks.position));

    for (let i = 0; i < remaining.length; i++) {
      await tx
        .update(playlistTracks)
        .set({ position: i })
        .where(
          and(
            eq(playlistTracks.playlistId, playlistId),
            eq(playlistTracks.trackId, remaining[i].trackId)
          )
        );
    }

    await tx
      .update(playlists)
      .set({ updatedAt: new Date().toISOString(), needsSync: 1 })
      .where(eq(playlists.id, playlistId));
  });
}

export async function markPlaylistSynced(playlistId: string) {
  await db
    .update(playlists)
    .set({ needsSync: 0, syncedAt: new Date().toISOString() })
    .where(eq(playlists.id, playlistId));
}

// ── Library Stats ──────────────────────────────────────

export async function getLibraryStats() {
  const result = await db
    .select({
      artistCount: sql<number>`(SELECT count(*) FROM artists)`,
      albumCount: sql<number>`(SELECT count(*) FROM albums)`,
      trackCount: sql<number>`(SELECT count(*) FROM tracks)`,
      playlistCount: sql<number>`(SELECT count(*) FROM playlists)`,
      mixTapeCount: sql<number>`(SELECT count(*) FROM playlists WHERE is_mix_tape = 1)`,
    })
    .from(sql`(SELECT 1)`)
    .get();

  return {
    artists: result?.artistCount ?? 0,
    albums: result?.albumCount ?? 0,
    tracks: result?.trackCount ?? 0,
    playlists: result?.playlistCount ?? 0,
    mixTapes: result?.mixTapeCount ?? 0,
  };
}
