/**
 * Bridge for un-migrated consumers (playback store, library store).
 *
 * The real implementation is in `services/downloads/`. Once playback and
 * library stores are migrated to the service layer, this file can be deleted.
 */
import type { DownloadService } from "@/src/services/downloads/downloads";

let _downloadService: DownloadService | null = null;

/** Called once from DownloadInitializer in _layout.tsx */
const setDownloadService = (service: DownloadService) => {
  _downloadService = service;
};

/** Used by playback store to resolve local file paths */
const getDownloadedFilePath = (trackId: string): string | undefined =>
  _downloadService?.getFilePath(trackId, 'track');

/** Used by library store for offline filtering */
const getOfflineMode = (): boolean =>
  _downloadService?.offlineMode ?? false;

export { setDownloadService, getDownloadedFilePath, getOfflineMode };
