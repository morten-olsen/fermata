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

// ── Chunked upsert helper ──────────────────────────────
// TODO: Replace chunked yields with proper background-thread SQLite
// (e.g. expo-sqlite WAL + worker) so sync never touches the JS thread.

const CHUNK_SIZE = 75;

/**
 * Yield control back to the JS event loop so the UI thread can render frames.
 */
const yieldToUI = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Run `upsertFn` for each row inside chunked transactions, yielding to the UI
 * thread between chunks so frames can render during large syncs.
 */
async function chunkedUpsert<T>(
  rows: T[],
  upsertFn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0], row: T) => Promise<void>,
) {
  if (rows.length === 0) return;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await db.transaction(async (tx) => {
      for (const row of chunk) {
        await upsertFn(tx, row);
      }
    });
    if (i + CHUNK_SIZE < rows.length) await yieldToUI();
  }
}

// ── Upserts (used by sync engine) ──────────────────────

export async function upsertArtists(rows: (typeof artists.$inferInsert)[]) {
  await chunkedUpsert(rows, async (tx, row) => {
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
  });
}

export async function upsertAlbums(rows: (typeof albums.$inferInsert)[]) {
  await chunkedUpsert(rows, async (tx, row) => {
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
          chapters: row.chapters,
          syncedAt: row.syncedAt,
        },
      });
  });
}

export async function upsertTracks(rows: (typeof tracks.$inferInsert)[]) {
  await chunkedUpsert(rows, async (tx, row) => {
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
          contentUrl: row.contentUrl,
          chapterStartMs: row.chapterStartMs,
          artworkSourceItemId: row.artworkSourceItemId,
          syncedAt: row.syncedAt,
        },
      });
  });
}

export async function upsertPlaylists(
  rows: (typeof playlists.$inferInsert)[]
) {
  await chunkedUpsert(rows, async (tx, row) => {
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
  });
}

export async function replacePlaylistTracks(
  playlistId: string,
  rows: (typeof playlistTracks.$inferInsert)[]
) {
  // Delete is always a single statement; only the inserts need chunking
  await db
    .delete(playlistTracks)
    .where(eq(playlistTracks.playlistId, playlistId));

  await chunkedUpsert(rows, async (tx, row) => {
    await tx.insert(playlistTracks).values(row).onConflictDoNothing();
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

  const filtered = rows.filter((r) => !pendingSyncIds.has(r.trackId));

  await chunkedUpsert(filtered, async (tx, row) => {
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
  });
}
