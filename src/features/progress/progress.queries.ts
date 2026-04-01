import { eq, and, inArray, sql } from "drizzle-orm";

import { db } from "@/src/shared/db/db.client";
import { playbackProgress, tracks } from "@/src/shared/db/db.schema";

import type { ProgressEntry } from "./progress.types";

// ── Helpers ──────────────────────────────────────────

type ProgressRow = typeof playbackProgress.$inferSelect;

function toProgressEntry(row: ProgressRow): ProgressEntry {
  return {
    trackId: row.trackId,
    positionMs: row.positionMs,
    durationMs: row.durationMs,
    isCompleted: row.isCompleted === 1,
    updatedAt: row.updatedAt,
  };
}

// ── Read ──────────────────────────────────────────────

export async function getProgress(
  trackId: string,
): Promise<ProgressEntry | undefined> {
  const row = await db
    .select()
    .from(playbackProgress)
    .where(eq(playbackProgress.trackId, trackId))
    .get();

  return row ? toProgressEntry(row) : undefined;
}

export async function getProgressBatch(
  trackIds: string[],
): Promise<Map<string, ProgressEntry>> {
  if (trackIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(playbackProgress)
    .where(inArray(playbackProgress.trackId, trackIds));

  const map = new Map<string, ProgressEntry>();
  for (const row of rows) {
    map.set(row.trackId, toProgressEntry(row));
  }
  return map;
}

/**
 * Per-album progress summary: completed track count and total track count.
 * Returns a Map of albumId → { completed, total, fraction }.
 */
export async function getAlbumProgressSummaries(
  albumIds: string[],
): Promise<Map<string, { completed: number; started: number; total: number; fraction: number }>> {
  if (albumIds.length === 0) return new Map();

  const rows = await db
    .select({
      albumId: tracks.albumId,
      total: sql<number>`count(*)`.as("total"),
      completed: sql<number>`sum(case when ${playbackProgress.isCompleted} = 1 then 1 else 0 end)`.as("completed"),
      started: sql<number>`sum(case when ${playbackProgress.positionMs} > 0 or ${playbackProgress.isCompleted} = 1 then 1 else 0 end)`.as("started"),
    })
    .from(tracks)
    .leftJoin(playbackProgress, eq(tracks.id, playbackProgress.trackId))
    .where(inArray(tracks.albumId, albumIds))
    .groupBy(tracks.albumId);

  const map = new Map<string, { completed: number; started: number; total: number; fraction: number }>();
  for (const row of rows) {
    const completed = row.completed || 0;
    const started = row.started || 0;
    const total = row.total;
    map.set(row.albumId, {
      completed,
      started,
      total,
      fraction: total > 0 ? completed / total : 0,
    });
  }
  return map;
}

/**
 * Same as getAlbumProgressSummaries but filters by media type instead of
 * a list of album IDs. Much faster for large libraries — avoids a huge
 * IN (...) clause and lets SQLite use the media_type index.
 */
export async function getAlbumProgressByMediaType(
  mediaType: string,
): Promise<Map<string, { completed: number; started: number; total: number; fraction: number }>> {
  const rows = await db
    .select({
      albumId: tracks.albumId,
      total: sql<number>`count(*)`.as("total"),
      completed: sql<number>`sum(case when ${playbackProgress.isCompleted} = 1 then 1 else 0 end)`.as("completed"),
      started: sql<number>`sum(case when ${playbackProgress.positionMs} > 0 or ${playbackProgress.isCompleted} = 1 then 1 else 0 end)`.as("started"),
    })
    .from(tracks)
    .leftJoin(playbackProgress, eq(tracks.id, playbackProgress.trackId))
    .where(eq(tracks.mediaType, mediaType))
    .groupBy(tracks.albumId);

  const map = new Map<string, { completed: number; started: number; total: number; fraction: number }>();
  for (const row of rows) {
    const completed = row.completed || 0;
    const started = row.started || 0;
    const total = row.total;
    map.set(row.albumId, {
      completed,
      started,
      total,
      fraction: total > 0 ? completed / total : 0,
    });
  }
  return map;
}

// ── Write ─────────────────────────────────────────────

export async function saveProgress(
  trackId: string,
  positionMs: number,
  durationMs: number,
  isCompleted: boolean,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(playbackProgress)
    .values({
      trackId,
      positionMs,
      durationMs,
      isCompleted: isCompleted ? 1 : 0,
      updatedAt: now,
      needsSync: 1,
    })
    .onConflictDoUpdate({
      target: playbackProgress.trackId,
      set: {
        positionMs,
        durationMs,
        isCompleted: isCompleted ? 1 : 0,
        updatedAt: now,
        needsSync: 1,
      },
    });
}

// ── Sync helpers (used by sync engine) ────────────────

/**
 * Get all progress entries with needsSync = 1 for a given source,
 * joined with the tracks table to retrieve sourceItemId.
 */
export async function getPendingProgressForSource(
  sourceId: string,
): Promise<
  {
    trackId: string;
    sourceItemId: string;
    chapterStartMs: number | null;
    positionMs: number;
    durationMs: number;
    isCompleted: number;
  }[]
> {
  return db
    .select({
      trackId: playbackProgress.trackId,
      sourceItemId: tracks.sourceItemId,
      chapterStartMs: tracks.chapterStartMs,
      positionMs: playbackProgress.positionMs,
      durationMs: playbackProgress.durationMs,
      isCompleted: playbackProgress.isCompleted,
    })
    .from(playbackProgress)
    .innerJoin(tracks, eq(playbackProgress.trackId, tracks.id))
    .where(
      and(
        eq(playbackProgress.needsSync, 1),
        eq(tracks.sourceId, sourceId),
      ),
    );
}

export async function clearProgressNeedsSync(
  trackIds: string[],
): Promise<void> {
  if (trackIds.length === 0) return;
  await db
    .update(playbackProgress)
    .set({ needsSync: 0 })
    .where(inArray(playbackProgress.trackId, trackIds));
}
