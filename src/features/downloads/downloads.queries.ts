import { eq, and, sql, asc, inArray } from "drizzle-orm";

import { db } from "@/src/shared/db/db.client";
import {
  offlinePins,
  downloads,
  tracks,
  playlists,
  playlistTracks,
} from "@/src/shared/db/db.schema";
import { generateId } from "@/src/shared/lib/ids";

// ── Offline Pins ──────────────────────────────────────

export async function getPin(entityType: string, entityId: string) {
  return db
    .select()
    .from(offlinePins)
    .where(
      and(
        eq(offlinePins.entityType, entityType),
        eq(offlinePins.entityId, entityId)
      )
    )
    .get();
}

export async function getAllPins() {
  return db.select().from(offlinePins);
}

export async function addPin(
  entityType: string,
  entityId: string,
  sourceId: string
) {
  await db
    .insert(offlinePins)
    .values({
      id: generateId(),
      entityType,
      entityId,
      sourceId,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing();
}

export async function removePin(entityType: string, entityId: string) {
  await db
    .delete(offlinePins)
    .where(
      and(
        eq(offlinePins.entityType, entityType),
        eq(offlinePins.entityId, entityId)
      )
    );
}

// ── Downloads ─────────────────────────────────────────

export type DownloadStatus = "pending" | "downloading" | "complete" | "error";

export async function getDownload(trackId: string) {
  return db
    .select()
    .from(downloads)
    .where(eq(downloads.trackId, trackId))
    .get();
}

export async function getDownloadsByStatus(status: DownloadStatus) {
  return db
    .select()
    .from(downloads)
    .where(eq(downloads.status, status));
}

export async function getPendingDownloads() {
  return db
    .select({ trackId: downloads.trackId, sourceId: downloads.sourceId })
    .from(downloads)
    .where(eq(downloads.status, "pending"))
    .orderBy(asc(downloads.trackId));
}

export async function enqueueTrackDownload(trackId: string, sourceId: string) {
  const track = await db
    .select()
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .get();
  if (!track) return;

  await db
    .insert(downloads)
    .values({
      trackId,
      sourceId,
      status: "pending",
      retryCount: 0,
    })
    .onConflictDoNothing();
}

export async function enqueueTracksForAlbum(albumId: string, sourceId: string) {
  const albumTracks = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.albumId, albumId));

  for (const t of albumTracks) {
    await enqueueTrackDownload(t.id, sourceId);
  }
}

export async function enqueueTracksForArtist(
  artistName: string,
  sourceId: string
) {
  const artistTracks = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.artistName, artistName));

  for (const t of artistTracks) {
    await enqueueTrackDownload(t.id, sourceId);
  }
}

export async function enqueueTracksForPlaylist(
  playlistId: string,
  sourceId: string
) {
  const playlistTrackRows = await db
    .select({ trackId: playlistTracks.trackId })
    .from(playlistTracks)
    .where(eq(playlistTracks.playlistId, playlistId));

  for (const t of playlistTrackRows) {
    await enqueueTrackDownload(t.trackId, sourceId);
  }
}

export async function updateDownloadStatus(
  trackId: string,
  status: DownloadStatus,
  extra?: {
    filePath?: string;
    fileSize?: number;
    downloadedAt?: string;
    syncedAt?: string;
    errorMessage?: string;
    retryCount?: number;
  }
) {
  await db
    .update(downloads)
    .set({ status, ...extra })
    .where(eq(downloads.trackId, trackId));
}

export async function removeDownloadRow(trackId: string) {
  await db.delete(downloads).where(eq(downloads.trackId, trackId));
}

export async function removeDownloadsBySource(sourceId: string) {
  await db.delete(downloads).where(eq(downloads.sourceId, sourceId));
}

/** Reset in-progress downloads to pending (for app restart recovery) */
export async function resetStuckDownloads() {
  await db
    .update(downloads)
    .set({ status: "pending" })
    .where(eq(downloads.status, "downloading"));
}

/**
 * Find tracks that are downloaded but whose source data has changed.
 * These need re-downloading.
 */
export async function markStaleDownloads(sourceId: string) {
  await db.run(sql`
    UPDATE downloads SET status = 'pending', file_path = NULL
    WHERE source_id = ${sourceId} AND status = 'complete'
    AND track_id IN (
      SELECT t.id FROM tracks t
      WHERE t.synced_at != downloads.synced_at
    )
  `);
}

/**
 * Find downloaded tracks that are not covered by any pin.
 * Returns track IDs that should be removed.
 */
export async function findOrphanedDownloads(): Promise<string[]> {
  const result = await db.all<{ trackId: string }>(sql`
    SELECT d.track_id as trackId FROM downloads d
    WHERE d.track_id NOT IN (
      -- Individually pinned tracks
      SELECT op.entity_id FROM offline_pins op WHERE op.entity_type = 'track'
    )
    AND d.track_id NOT IN (
      -- Tracks belonging to pinned albums
      SELECT t.id FROM tracks t
      INNER JOIN offline_pins op ON op.entity_type = 'album' AND op.entity_id = t.album_id
    )
    AND d.track_id NOT IN (
      -- Tracks belonging to pinned artists
      SELECT t.id FROM tracks t
      INNER JOIN offline_pins op ON op.entity_type = 'artist' AND op.entity_id = t.artist_name
    )
    AND d.track_id NOT IN (
      -- Tracks belonging to pinned playlists
      SELECT pt.track_id FROM playlist_tracks pt
      INNER JOIN offline_pins op ON op.entity_type = 'playlist' AND op.entity_id = pt.playlist_id
    )
  `);
  return result.map((r) => r.trackId);
}

// ── Stats ─────────────────────────────────────────────

export async function getDownloadStats() {
  const result = await db
    .select({
      totalTracks: sql<number>`count(*)`,
      completedTracks: sql<number>`sum(case when status = 'complete' then 1 else 0 end)`,
      pendingTracks: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
      errorTracks: sql<number>`sum(case when status = 'error' then 1 else 0 end)`,
      totalBytes: sql<number>`coalesce(sum(case when status = 'complete' then file_size else 0 end), 0)`,
    })
    .from(downloads)
    .get();

  return {
    totalTracks: result?.totalTracks ?? 0,
    completedTracks: result?.completedTracks ?? 0,
    pendingTracks: result?.pendingTracks ?? 0,
    errorTracks: result?.errorTracks ?? 0,
    totalBytes: result?.totalBytes ?? 0,
  };
}

/** Get all completed download file paths (for building the in-memory cache) */
export async function getCompletedDownloads() {
  return db
    .select({ trackId: downloads.trackId, filePath: downloads.filePath })
    .from(downloads)
    .where(eq(downloads.status, "complete"));
}
