import { eq } from "drizzle-orm";

import type { SourceAdapter } from "@/src/features/sources/sources";
import { prefetchArtwork } from "@/src/features/artwork/artwork";
import {
  getPlaylistsNeedingSync,
  getPlaylistTracks,
  markPlaylistSynced,
} from "@/src/features/library/library";

import { log } from "@/src/shared/lib/log";
import { stableId } from "@/src/shared/lib/ids";
import { db } from "@/src/shared/db/db.client";
import { sources } from "@/src/shared/db/db.schema";

import {
  upsertArtists,
  upsertAlbums,
  upsertTracks,
  upsertPlaylists,
  replacePlaylistTracks,
} from "./sync.queries";

export interface SyncProgress {
  sourceId: string;
  sourceName: string;
  phase: "artists" | "albums" | "tracks" | "playlists" | "done";
  status: "started" | "completed";
  itemCount: number;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

function emitProgress(
  cb: SyncProgressCallback | undefined,
  sourceId: string,
  sourceName: string,
  phase: SyncProgress["phase"],
  status: SyncProgress["status"],
  itemCount: number
) {
  cb?.({ sourceId, sourceName, phase, status, itemCount });
}

/**
 * Sync a single source adapter's library into the local database.
 * Uses deterministic IDs so records are stable across re-syncs.
 *
 * Playlist sync includes offline reconciliation:
 * 1. Push any locally-modified playlists (needsSync=1) to the source
 * 2. Pull all playlists from the source and upsert locally
 */
export async function syncSource(
  adapter: SourceAdapter,
  onProgress?: SyncProgressCallback
): Promise<{ artists: number; albums: number; tracks: number; playlists: number }> {
  const sourceRow = await db
    .select()
    .from(sources)
    .where(eq(sources.id, adapter.id))
    .get();

  const since = sourceRow?.lastSyncedAt
    ? new Date(sourceRow.lastSyncedAt)
    : undefined;

  const now = new Date().toISOString();
  const sid = adapter.id;

  // ── Artists ────────────────────────────────────────
  emitProgress(onProgress, sid, adapter.name, "artists", "started", 0);

  const remoteArtists = await adapter.getArtists(since);
  const artistRows = remoteArtists.map((a) => ({
    id: stableId(a.sourceId, a.sourceItemId),
    sourceId: a.sourceId,
    sourceItemId: a.sourceItemId,
    name: a.name,
    artworkSourceItemId: a.artworkSourceItemId ?? null,
    syncedAt: now,
  }));
  await upsertArtists(artistRows);

  emitProgress(onProgress, sid, adapter.name, "artists", "completed", artistRows.length);

  // ── Albums ─────────────────────────────────────────
  emitProgress(onProgress, sid, adapter.name, "albums", "started", 0);

  const remoteAlbums = await adapter.getAlbums(since);
  const albumRows = remoteAlbums.map((a) => ({
    id: stableId(a.sourceId, a.sourceItemId),
    sourceId: a.sourceId,
    sourceItemId: a.sourceItemId,
    title: a.title,
    artistName: a.artistName,
    year: a.year ?? null,
    artworkSourceItemId: a.artworkSourceItemId ?? null,
    trackCount: a.trackCount ?? null,
    syncedAt: now,
  }));
  await upsertAlbums(albumRows);

  emitProgress(onProgress, sid, adapter.name, "albums", "completed", albumRows.length);

  // ── Prefetch album artwork in background ──
  const artworkItems = remoteAlbums
    .filter((a) => a.artworkSourceItemId)
    .map((a) => ({
      sourceId: a.sourceId,
      itemId: a.artworkSourceItemId!,
      remoteUrl: adapter.getArtworkUrl(a.artworkSourceItemId!, "medium"),
    }));

  // Fire and forget — don't block sync for artwork downloads
  prefetchArtwork(artworkItems, "medium").then((count) => {
    log(`Artwork prefetch: ${count}/${artworkItems.length} album covers cached`);
  });

  // ── Build album lookup ──
  const albumIdLookup = (sourceItemId: string) =>
    stableId(adapter.id, sourceItemId);

  // ── Tracks ─────────────────────────────────────────
  emitProgress(onProgress, sid, adapter.name, "tracks", "started", 0);

  const remoteTracks = await adapter.getTracks(since);
  const trackRows = remoteTracks.map((t) => ({
    id: stableId(t.sourceId, t.sourceItemId),
    sourceId: t.sourceId,
    sourceItemId: t.sourceItemId,
    title: t.title,
    artistName: t.artistName,
    albumTitle: t.albumTitle,
    albumId: t.albumSourceItemId ? albumIdLookup(t.albumSourceItemId) : null,
    duration: t.duration,
    trackNumber: t.trackNumber ?? null,
    discNumber: t.discNumber ?? null,
    isFavourite: t.isFavourite ? 1 : 0,
    syncedAt: now,
  }));
  await upsertTracks(trackRows);

  emitProgress(onProgress, sid, adapter.name, "tracks", "completed", trackRows.length);

  // ── Playlists (with offline reconciliation) ────────
  emitProgress(onProgress, sid, adapter.name, "playlists", "started", 0);

  // Step 1: Push locally-modified playlists to source before pulling
  await pushPendingPlaylists(adapter);

  // Step 2: Pull all playlists from source
  const remotePlaylists = await adapter.getPlaylists();
  const playlistRows = remotePlaylists.map((p) => ({
    id: stableId(p.sourceId, p.sourceItemId),
    sourceId: p.sourceId,
    sourceItemId: p.sourceItemId,
    name: p.name,
    description: p.description ?? null,
    artworkSourceItemId: p.artworkSourceItemId ?? null,
    trackCount: p.trackSourceItemIds.length,
    needsSync: 0,
    createdAt: now,
    updatedAt: now,
    syncedAt: now,
  }));
  await upsertPlaylists(playlistRows);

  // Step 3: Sync playlist track memberships (full replace per playlist)
  for (const p of remotePlaylists) {
    const playlistId = stableId(p.sourceId, p.sourceItemId);
    const trackEntries = p.trackSourceItemIds.map((trackSid, idx) => ({
      playlistId,
      trackId: stableId(adapter.id, trackSid),
      position: idx,
      addedAt: now,
    }));
    await replacePlaylistTracks(playlistId, trackEntries);
  }

  emitProgress(onProgress, sid, adapter.name, "playlists", "completed", playlistRows.length);

  // ── Update source last sync time ───────────────────
  await db
    .update(sources)
    .set({ lastSyncedAt: now })
    .where(eq(sources.id, adapter.id));

  emitProgress(onProgress, sid, adapter.name, "done", "completed", 0);

  return {
    artists: artistRows.length,
    albums: albumRows.length,
    tracks: trackRows.length,
    playlists: playlistRows.length,
  };
}

/**
 * Push locally-modified playlists to the source before pulling.
 * For each playlist with needsSync=1:
 *   - If it has a sourceItemId, push the current track list to the source
 *   - Mark as synced after successful push
 * If the push fails (e.g. offline), the needsSync flag stays set for next time.
 */
async function pushPendingPlaylists(adapter: SourceAdapter) {
  if (!adapter.addTracksToPlaylist) return;

  const pending = await getPlaylistsNeedingSync(adapter.id);

  for (const playlist of pending) {
    if (!playlist.sourceItemId) continue;

    try {
      // Get current local track list
      const localTracks = await getPlaylistTracks(playlist.id);
      const trackSourceItemIds = localTracks.map((t) => t.track.sourceItemId);

      // Full replace: remove all, then add all in order
      // This is simple and handles adds, removes, and reorders
      if (adapter.removeTracksFromPlaylist) {
        // Fetch current remote tracks to get their entry IDs for removal
        // For simplicity, we use the adapter's own getPlaylists to diff
        // but the cleanest approach is full replace via the API
        const remotePlaylists = await adapter.getPlaylists();
        const remote = remotePlaylists.find(
          (p) => p.sourceItemId === playlist.sourceItemId
        );
        if (remote && remote.trackSourceItemIds.length > 0) {
          await adapter.removeTracksFromPlaylist(
            playlist.sourceItemId,
            remote.trackSourceItemIds
          );
        }
      }

      if (trackSourceItemIds.length > 0) {
        await adapter.addTracksToPlaylist(
          playlist.sourceItemId,
          trackSourceItemIds
        );
      }

      await markPlaylistSynced(playlist.id);
    } catch (e) {
      // Push failed (likely offline) — needsSync stays set for next sync
      if (__DEV__) {
        console.warn(
          `[Fermata] Failed to push playlist "${playlist.name}":`,
          e
        );
      }
    }
  }
}

/**
 * Sync all connected sources sequentially.
 */
export async function syncAllSources(
  adapters: SourceAdapter[],
  onProgress?: SyncProgressCallback
): Promise<
  Map<string, { artists: number; albums: number; tracks: number; playlists: number }>
> {
  const results = new Map<
    string,
    { artists: number; albums: number; tracks: number; playlists: number }
  >();

  for (const adapter of adapters) {
    const result = await syncSource(adapter, onProgress);
    results.set(adapter.id, result);
  }

  return results;
}
