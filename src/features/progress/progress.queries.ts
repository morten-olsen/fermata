import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/src/shared/db/db.client";
import { playbackProgress, tracks } from "@/src/shared/db/db.schema";

import type { ProgressEntry } from "./progress.types";

// ── Read ──────────────────────────────────────────────

export async function getProgress(
  trackId: string,
): Promise<ProgressEntry | undefined> {
  const row = await db
    .select()
    .from(playbackProgress)
    .where(eq(playbackProgress.trackId, trackId))
    .get();

  if (!row) return undefined;

  return {
    trackId: row.trackId,
    positionMs: row.positionMs,
    durationMs: row.durationMs,
    isCompleted: row.isCompleted === 1,
    updatedAt: row.updatedAt,
  };
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
    map.set(row.trackId, {
      trackId: row.trackId,
      positionMs: row.positionMs,
      durationMs: row.durationMs,
      isCompleted: row.isCompleted === 1,
      updatedAt: row.updatedAt,
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
    positionMs: number;
    durationMs: number;
    isCompleted: number;
  }[]
> {
  return db
    .select({
      trackId: playbackProgress.trackId,
      sourceItemId: tracks.sourceItemId,
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
