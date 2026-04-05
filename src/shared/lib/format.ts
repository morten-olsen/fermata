/** Format seconds as m:ss or h:mm:ss (e.g. 215 → "3:35", 3661 → "1:01:01") */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Format seconds as a human-readable long form (e.g. 15720 → "4h 22m", 300 → "5 min"). */
export function formatDurationLong(seconds: number): string {
  if (seconds <= 0) return "0 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format a download status meta string for detail screens.
 * Returns "" if not pinned, " · Downloaded" if all done, or " · 3/10 downloaded".
 */
export function formatDownloadMeta(
  isPinned: boolean,
  downloadedCount: number,
  totalCount: number,
): string {
  if (!isPinned) return "";
  if (downloadedCount >= totalCount) return " · Downloaded";
  return ` · ${downloadedCount}/${totalCount} downloaded`;
}

/**
 * Format a track's remaining duration as "-m:ss" when partially played,
 * or full duration as "m:ss" otherwise.
 */
export function formatRemainingDuration(
  duration: number,
  progress: number | undefined,
  isCompleted: boolean | undefined,
): string {
  const hasProgress = progress != null && progress > 0 && !isCompleted;
  const displaySeconds = hasProgress ? Math.round(duration * (1 - progress)) : duration;
  const prefix = hasProgress ? "-" : "";
  return `${prefix}${formatDuration(displaySeconds)}`;
}

/** Returns a 0–1 fraction from positionMs/durationMs, or null if duration is unknown. */
export function progressFraction(positionMs: number, durationMs: number): number | null {
  return durationMs > 0 ? positionMs / durationMs : null;
}

/** Format a byte count as a human-readable string (e.g. 1048576 → "1.0 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
