import { eq, asc } from "drizzle-orm";

import { db } from "@/src/shared/db/db.client";
import {
  artists,
  albums,
  tracks,
  playlists,
  playlistTracks,
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
