import { eq, like, or, sql, desc, asc, and } from "drizzle-orm";

import type { MediaType } from "@/src/features/sources/sources";

import { db } from "@/src/shared/db/db.client";
import {
  artists,
  albums,
  tracks,
  playlists,
  playlistTracks,
  downloads,
} from "@/src/shared/db/db.schema";
import { generateId, stableId } from "@/src/shared/lib/ids";

// ── Artists ────────────────────────────────────────────

export async function getAllArtists(offlineOnly = false, mediaType?: MediaType) {
  const conditions = [];

  if (offlineOnly) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM tracks t INNER JOIN downloads d ON d.track_id = t.id WHERE t.artist_name = ${artists.name} AND d.status = 'complete')`
    );
  }

  if (mediaType) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM tracks t WHERE t.artist_name = ${artists.name} AND t.media_type = ${mediaType})`
    );
  }

  const where = conditions.length > 0
    ? conditions.length === 1 ? conditions[0] : and(...conditions)
    : undefined;

  return db.select().from(artists).where(where).orderBy(asc(artists.name));
}

export async function getAlbumsByArtist(artistName: string, mediaType?: MediaType) {
  const conditions = [eq(albums.artistName, artistName)];
  if (mediaType) {
    conditions.push(eq(albums.mediaType, mediaType));
  }
  return db
    .select()
    .from(albums)
    .where(and(...conditions))
    .orderBy(desc(albums.year));
}

// ── Albums ─────────────────────────────────────────────

export async function getAllAlbums(offlineOnly = false, mediaType?: MediaType) {
  const conditions = [];

  if (offlineOnly) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM downloads d INNER JOIN tracks t ON d.track_id = t.id WHERE t.album_id = ${albums.id} AND d.status = 'complete')`
    );
  }

  if (mediaType) {
    conditions.push(eq(albums.mediaType, mediaType));
  }

  const where = conditions.length > 0
    ? conditions.length === 1 ? conditions[0] : and(...conditions)
    : undefined;

  return db.select().from(albums).where(where).orderBy(asc(albums.title));
}

export async function getAlbum(id: string) {
  return db.select().from(albums).where(eq(albums.id, id)).get();
}

// ── Tracks ─────────────────────────────────────────────

export async function getTracks(limit?: number, offset = 0, offlineOnly = false, mediaType?: MediaType) {
  if (offlineOnly) {
    const q = db
      .select({ tracks })
      .from(tracks)
      .innerJoin(downloads, and(eq(downloads.trackId, tracks.id), eq(downloads.status, sql`'complete'`)))
      .where(mediaType ? eq(tracks.mediaType, mediaType) : undefined)
      .orderBy(asc(tracks.title))
      .offset(offset);
    const rows = limit != null ? await q.limit(limit) : await q;
    return rows.map((r) => r.tracks);
  }
  const q = db
    .select()
    .from(tracks)
    .where(mediaType ? eq(tracks.mediaType, mediaType) : undefined)
    .orderBy(asc(tracks.title))
    .offset(offset);
  return limit != null ? q.limit(limit) : q;
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

// ── Favourites ────────────────────────────────────────

export async function setAlbumFavourite(id: string, isFavourite: boolean) {
  return db
    .update(albums)
    .set({ isFavourite: isFavourite ? 1 : 0 })
    .where(eq(albums.id, id));
}

export async function getFavouriteAlbums(mediaType?: MediaType) {
  const conditions = [eq(albums.isFavourite, 1)];
  if (mediaType) {
    conditions.push(eq(albums.mediaType, mediaType));
  }
  return db
    .select()
    .from(albums)
    .where(and(...conditions))
    .orderBy(asc(albums.title));
}

export async function getInProgressAlbums(mediaType?: MediaType) {
  const conditions = [
    sql`EXISTS (
      SELECT 1 FROM playback_progress pp
      INNER JOIN tracks t ON pp.track_id = t.id
      WHERE t.album_id = ${albums.id}
      AND pp.is_completed = 0
      AND pp.position_ms > 0
    )`,
  ];
  if (mediaType) {
    conditions.push(eq(albums.mediaType, mediaType));
  }
  return db
    .select()
    .from(albums)
    .where(and(...conditions))
    .orderBy(asc(albums.title));
}

export async function setTrackFavourite(id: string, isFavourite: boolean) {
  return db
    .update(tracks)
    .set({ isFavourite: isFavourite ? 1 : 0 })
    .where(eq(tracks.id, id));
}

// ── Search ─────────────────────────────────────────────

export async function searchLibrary(query: string, mediaType?: MediaType) {
  const pattern = `%${query}%`;

  const artistNameFilter = like(artists.name, pattern);
  const artistMediaFilter = mediaType
    ? and(
        artistNameFilter,
        sql`EXISTS (SELECT 1 FROM tracks t WHERE t.artist_name = ${artists.name} AND t.media_type = ${mediaType})`,
      )
    : artistNameFilter;

  const albumTextFilter = or(like(albums.title, pattern), like(albums.artistName, pattern));
  const albumFilter = mediaType
    ? and(albumTextFilter, eq(albums.mediaType, mediaType))
    : albumTextFilter;

  const trackTextFilter = or(
    like(tracks.title, pattern),
    like(tracks.artistName, pattern),
    like(tracks.albumTitle, pattern),
  );
  const trackFilter = mediaType
    ? and(trackTextFilter, eq(tracks.mediaType, mediaType))
    : trackTextFilter;

  const [matchedArtists, matchedAlbums, matchedTracks] = await Promise.all([
    db
      .select()
      .from(artists)
      .where(artistMediaFilter)
      .orderBy(asc(artists.name))
      .limit(20),
    db
      .select()
      .from(albums)
      .where(albumFilter)
      .orderBy(asc(albums.title))
      .limit(20),
    db
      .select()
      .from(tracks)
      .where(trackFilter)
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

export async function getPlaylistsNeedingSync(sourceId: string) {
  return db
    .select()
    .from(playlists)
    .where(
      and(eq(playlists.sourceId, sourceId), eq(playlists.needsSync, 1))
    );
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
      musicAlbumCount: sql<number>`(SELECT count(*) FROM albums WHERE media_type = 'music')`,
      podcastCount: sql<number>`(SELECT count(*) FROM albums WHERE media_type = 'podcast')`,
      audiobookCount: sql<number>`(SELECT count(*) FROM albums WHERE media_type = 'audiobook')`,
    })
    .from(sql`(SELECT 1)`)
    .get();

  return {
    artists: result?.artistCount ?? 0,
    albums: result?.albumCount ?? 0,
    tracks: result?.trackCount ?? 0,
    playlists: result?.playlistCount ?? 0,
    mixTapes: result?.mixTapeCount ?? 0,
    musicAlbums: result?.musicAlbumCount ?? 0,
    podcasts: result?.podcastCount ?? 0,
    audiobooks: result?.audiobookCount ?? 0,
  };
}
