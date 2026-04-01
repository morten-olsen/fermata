import { log, warn } from "@/src/shared/lib/log";

import {
  saveProgress,
  getProgress,
  getPendingProgressForSource,
  clearProgressNeedsSync,
} from "./progress.queries";

/** Threshold: consider a track completed when within 30s of the end */
const COMPLETION_THRESHOLD_MS = 30_000;

/** Skip writes when position hasn't moved significantly (5s tolerance) */
const POSITION_CHANGE_THRESHOLD_MS = 5_000;
let lastSavedTrackId = "";
let lastSavedPositionMs = 0;

/**
 * Record playback progress for a track.
 * Determines isCompleted automatically based on position vs duration.
 * Skips writes when position hasn't changed significantly.
 */
export async function recordProgress(
  trackId: string,
  positionMs: number,
  durationMs: number,
): Promise<void> {
  if (positionMs <= 0) return;

  // Skip if position hasn't moved enough (avoids redundant DB writes from periodic timer)
  if (
    trackId === lastSavedTrackId &&
    Math.abs(positionMs - lastSavedPositionMs) < POSITION_CHANGE_THRESHOLD_MS
  ) {
    return;
  }

  const isCompleted =
    durationMs > 0 && positionMs >= durationMs - COMPLETION_THRESHOLD_MS;

  await saveProgress(trackId, positionMs, durationMs, isCompleted);
  lastSavedTrackId = trackId;
  lastSavedPositionMs = positionMs;
  log("Progress saved:", trackId, `${Math.round(positionMs / 1000)}s`, isCompleted ? "(completed)" : "");
}

/**
 * Get the resume position for a track.
 * Returns 0 if no progress exists or the track is completed.
 */
export async function getResumePosition(trackId: string): Promise<number> {
  const entry = await getProgress(trackId);
  if (!entry) return 0;
  if (entry.isCompleted) return 0; // completed tracks start over
  return entry.positionMs;
}

// ── Album progress classification ────────────────────

export type AlbumProgressState = "none" | "in_progress" | "finished";

/**
 * Classify albums as none / in_progress / finished from progress summaries.
 * Shared by the podcast and audiobook list screens.
 */
export function classifyAlbumProgress(
  albumIds: string[],
  summaries: Map<string, { completed: number; started: number; total: number; fraction: number }>,
): Map<string, AlbumProgressState> {
  const states = new Map<string, AlbumProgressState>();
  for (const id of albumIds) {
    const s = summaries.get(id);
    if (!s || s.started === 0) {
      states.set(id, "none");
    } else if (s.fraction >= 1 && s.total > 0) {
      states.set(id, "finished");
    } else {
      states.set(id, "in_progress");
    }
  }
  return states;
}

// ── Chapter progress computation ─────────────────────

interface ChapterLike {
  id: string;
  duration: number; // seconds
}

/**
 * Compute per-chapter progress fractions from a progress map.
 *
 * Two modes:
 * 1. Per-chapter progress entries exist → use them directly
 * 2. Only whole-book progress (on first chapter) → distribute across chapters
 *    based on cumulative duration. This handles the initial sync from ABS
 *    before any local playback has occurred.
 */
export function computeChapterProgress(
  chapters: ChapterLike[],
  progressMap: Map<string, { positionMs: number; durationMs: number; isCompleted: boolean }>,
): Map<string, { fraction: number; isCompleted: boolean }> {
  const map = new Map<string, { fraction: number; isCompleted: boolean }>();
  if (chapters.length === 0) return map;

  // Check if we have per-chapter progress entries
  let hasPerChapterProgress = false;
  for (const c of chapters) {
    const p = progressMap.get(c.id);
    if (p && (p.positionMs > 0 || p.isCompleted)) {
      hasPerChapterProgress = true;
      break;
    }
  }

  if (hasPerChapterProgress) {
    for (const c of chapters) {
      const p = progressMap.get(c.id);
      if (p) {
        const dMs = p.durationMs > 0 ? p.durationMs : c.duration * 1000;
        map.set(c.id, {
          fraction: dMs > 0 ? p.positionMs / dMs : 0,
          isCompleted: p.isCompleted,
        });
      }
    }
    return map;
  }

  // Fallback: whole-book progress on first chapter → distribute across chapters
  const bookProgress = progressMap.get(chapters[0].id);
  if (!bookProgress || bookProgress.durationMs === 0) return map;

  const bookPositionSec = bookProgress.positionMs / 1000;
  let cumulativeSec = 0;

  for (const c of chapters) {
    const chapterStart = cumulativeSec;
    const chapterEnd = cumulativeSec + c.duration;

    if (bookProgress.isCompleted || bookPositionSec >= chapterEnd) {
      map.set(c.id, { fraction: 1, isCompleted: true });
    } else if (bookPositionSec > chapterStart) {
      const chapterPos = bookPositionSec - chapterStart;
      map.set(c.id, { fraction: chapterPos / c.duration, isCompleted: false });
    }

    cumulativeSec = chapterEnd;
  }

  return map;
}

// ── Book chapter progress (album-level chapters) ─────

interface AlbumChapter {
  title: string;
  start: number; // seconds
  end: number; // seconds
}

/**
 * Compute per-chapter progress from a single track's position.
 * Used with the new data model where chapters live on the album
 * and each audio file is a single track.
 */
export function computeBookChapterProgress(
  chapters: AlbumChapter[],
  bookPositionMs: number,
  bookCompleted: boolean,
): Map<number, { fraction: number; isCompleted: boolean }> {
  const map = new Map<number, { fraction: number; isCompleted: boolean }>();

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const chStartMs = ch.start * 1000;
    const chEndMs = ch.end * 1000;
    const chDurationMs = chEndMs - chStartMs;

    if (bookCompleted || bookPositionMs >= chEndMs) {
      map.set(i, { fraction: 1, isCompleted: true });
    } else if (bookPositionMs > chStartMs && chDurationMs > 0) {
      const chapterPos = bookPositionMs - chStartMs;
      map.set(i, { fraction: chapterPos / chDurationMs, isCompleted: false });
    }
  }

  return map;
}

/** Minimal interface for progress push — avoids importing from sources feature */
interface ProgressReporter {
  reportProgress?(
    sourceItemId: string,
    positionMs: number,
    durationMs: number,
    isCompleted: boolean,
    chapterStartMs?: number,
  ): Promise<void>;
}

/**
 * Push all pending local progress to the source.
 * Called during sync. Clears needsSync flags on success.
 */
export async function pushProgressToSource(
  adapter: ProgressReporter,
  sourceId: string,
): Promise<number> {
  if (!adapter.reportProgress) return 0;

  const pending = await getPendingProgressForSource(sourceId);
  if (pending.length === 0) return 0;

  const pushed: string[] = [];

  for (const entry of pending) {
    try {
      await adapter.reportProgress(
        entry.sourceItemId,
        entry.positionMs,
        entry.durationMs,
        entry.isCompleted === 1,
        entry.chapterStartMs ?? undefined,
      );
      pushed.push(entry.trackId);
    } catch (e) {
      warn("Failed to push progress for track:", entry.trackId, e);
    }
  }

  if (pushed.length > 0) {
    await clearProgressNeedsSync(pushed);
  }

  return pushed.length;
}
