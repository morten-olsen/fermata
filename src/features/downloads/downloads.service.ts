import {
  ensureDir,
  downloadFile,
  fileExists,
  deleteFile,
  deleteDir,
} from "@/src/shared/lib/fs";
import { getTrack } from "@/src/features/library/library";

import { log, warn } from "@/src/shared/lib/log";

import {
  getPendingDownloads,
  updateDownloadStatus,
  removeDownloadRow,
  resetStuckDownloads,
  getDownload,
  getCompletedDownloads,
} from "./downloads.queries";

const DOWNLOAD_PATH = ["downloads", "audio"] as const;
const MAX_RETRIES = 3;

/** Adapter resolver — injected at init */
let resolveAdapter: (
  sourceId: string
) => { getStreamUrl: (sourceItemId: string, contentUrl?: string | null) => string | Promise<string> } | undefined = () => undefined;

export function setDownloadAdapterResolver(
  resolver: typeof resolveAdapter
) {
  resolveAdapter = resolver;
}

/** In-memory cache of completed downloads: trackId → file URI */
const fileCache = new Map<string, string>();
/** In-memory set of tracks queued for download (pending or downloading) */
const queuedSet = new Set<string>();

export function getDownloadedFilePath(trackId: string): string | undefined {
  return fileCache.get(trackId);
}

export function isTrackDownloaded(trackId: string): boolean {
  return fileCache.has(trackId);
}

export function isTrackQueued(trackId: string): boolean {
  return queuedSet.has(trackId);
}

/** Populate caches from DB on app startup */
export async function initDownloadCache() {
  const rows = await getCompletedDownloads();
  fileCache.clear();
  for (const row of rows) {
    if (row.filePath) {
      fileCache.set(row.trackId, row.filePath);
    }
  }

  const pending = await getPendingDownloads();
  queuedSet.clear();
  for (const row of pending) {
    queuedSet.add(row.trackId);
  }

  log("Download cache loaded:", fileCache.size, "downloaded,", queuedSet.size, "queued");
}

/** Called after each track completes/fails — lets the store refresh */
let onTrackDone: (() => void) | undefined;

export function setOnTrackDone(cb: (() => void) | undefined) {
  onTrackDone = cb;
}

/**
 * Process the download queue one track at a time, yielding to the
 * UI thread between each download via setTimeout. Never blocks the UI.
 */
let isScheduled = false;

export function processQueue() {
  if (isScheduled) return;
  isScheduled = true;
  ensureDir(...DOWNLOAD_PATH).then(() => {
    // Reset stuck downloads then start processing
    resetStuckDownloads().then(() => {
      scheduleNext();
    });
  });
}

function scheduleNext() {
  // Use setTimeout to yield to the UI thread
  setTimeout(async () => {
    const pending = await getPendingDownloads();
    if (pending.length === 0) {
      isScheduled = false;
      log("Download queue complete");
      onTrackDone?.();
      return;
    }

    const item = pending[0];
    await downloadTrack(item.trackId, item.sourceId);
    onTrackDone?.();

    // Schedule the next one — UI gets a chance to render between each
    scheduleNext();
  }, 0);
}

async function downloadTrack(trackId: string, sourceId: string) {
  const track = await getTrack(trackId);
  if (!track) {
    await removeDownloadRow(trackId);
    return;
  }

  const adapter = resolveAdapter(sourceId);
  if (!adapter) {
    warn("Download: no adapter for source", sourceId);
    await updateDownloadStatus(trackId, "error", {
      errorMessage: "Source not connected",
    });
    queuedSet.delete(trackId);
    return;
  }

  const url = await adapter.getStreamUrl(track.sourceItemId, track.contentUrl);
  const destSegments = [...DOWNLOAD_PATH, `${trackId}.audio`] as const;

  queuedSet.add(trackId);
  log("Downloading:", track.title);
  await updateDownloadStatus(trackId, "downloading");

  try {
    await ensureDir(...DOWNLOAD_PATH);
    const { uri, size } = await downloadFile(url, ...destSegments);

    await updateDownloadStatus(trackId, "complete", {
      filePath: uri,
      fileSize: size,
      downloadedAt: new Date().toISOString(),
      syncedAt: track.syncedAt,
    });

    fileCache.set(trackId, uri);
    queuedSet.delete(trackId);
    log("Downloaded:", track.title, `(${(size / 1024 / 1024).toFixed(1)} MB)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Download failed";
    warn("Download failed:", track.title, msg);

    const dl = await getDownload(trackId);
    const retries = (dl?.retryCount ?? 0) + 1;

    if (retries < MAX_RETRIES) {
      await updateDownloadStatus(trackId, "pending", {
        retryCount: retries,
        errorMessage: msg,
      });
    } else {
      queuedSet.delete(trackId);
      await updateDownloadStatus(trackId, "error", {
        retryCount: retries,
        errorMessage: msg,
      });
    }
  }
}

/** Remove a downloaded file and its DB row */
export async function removeDownload(trackId: string) {
  const dl = await getDownload(trackId);
  if (dl?.filePath) {
    try {
      const exists = await fileExists(...DOWNLOAD_PATH, `${trackId}.audio`);
      if (exists) await deleteFile(...DOWNLOAD_PATH, `${trackId}.audio`);
    } catch {
      // File already gone
    }
  }
  await removeDownloadRow(trackId);
  fileCache.delete(trackId);
  queuedSet.delete(trackId);
}

/** Remove all downloads — clears files and DB */
export async function removeAllDownloads() {
  try {
    await deleteDir(...DOWNLOAD_PATH);
  } catch {
    // Directory already gone
  }
  const { db } = await import("@/src/shared/db/db.client");
  const { downloads } = await import("@/src/shared/db/db.schema");
  await db.delete(downloads);
  fileCache.clear();
  queuedSet.clear();
}
