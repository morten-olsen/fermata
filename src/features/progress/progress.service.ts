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

/** Minimal interface for progress push — avoids importing from sources feature */
interface ProgressReporter {
  reportProgress?(
    trackSourceItemId: string,
    positionMs: number,
    durationMs: number,
    isCompleted: boolean,
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
