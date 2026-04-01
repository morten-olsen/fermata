import { eq, inArray } from "drizzle-orm";

import { db } from "@/src/shared/db/db.client";
import {
  artists,
  albums,
  tracks,
  playlists,
  playlistTracks,
  playbackProgress,
} from "@/src/shared/db/db.schema";

// ── Upserts (used by sync engine) ──────────────────────

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
            mediaType: row.mediaType,
            syncedAt: row.syncedAt,
          },
        });
    }
  });
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
            mediaType: row.mediaType,
            description: row.description,
            publishedAt: row.publishedAt,
            episodeNumber: row.episodeNumber,
            syncedAt: row.syncedAt,
          },
        });
    }
  });
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
          },
        });
    }
  });
}

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

// ── Playback Progress (used by sync engine) ──────────

/**
 * Upsert progress from a remote source.
 * Respects needsSync: if a local row has needsSync = 1, the remote update
 * is skipped (local is authoritative until pushed).
 */
export async function upsertRemoteProgress(
  rows: {
    trackId: string;
    positionMs: number;
    durationMs: number;
    isCompleted: boolean;
    updatedAt: string;
  }[]
) {
  if (rows.length === 0) return;

  // Batch-read all existing needsSync flags to avoid N+1 SELECTs
  const trackIds = rows.map((r) => r.trackId);
  const existing = await db
    .select({ trackId: playbackProgress.trackId, needsSync: playbackProgress.needsSync })
    .from(playbackProgress)
    .where(inArray(playbackProgress.trackId, trackIds));

  const pendingSyncIds = new Set(
    existing.filter((e) => e.needsSync === 1).map((e) => e.trackId),
  );

  await db.transaction(async (tx) => {
    for (const row of rows) {
      if (pendingSyncIds.has(row.trackId)) continue; // local change takes priority

      await tx
        .insert(playbackProgress)
        .values({
          trackId: row.trackId,
          positionMs: row.positionMs,
          durationMs: row.durationMs,
          isCompleted: row.isCompleted ? 1 : 0,
          updatedAt: row.updatedAt,
          needsSync: 0,
        })
        .onConflictDoUpdate({
          target: playbackProgress.trackId,
          set: {
            positionMs: row.positionMs,
            durationMs: row.durationMs,
            isCompleted: row.isCompleted ? 1 : 0,
            updatedAt: row.updatedAt,
            needsSync: 0,
          },
        });
    }
  });
}
