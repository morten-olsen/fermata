import { z } from 'zod';

// ── Item types that can be downloaded ─────────────────

type DownloadItemType = 'track' | 'episode' | 'audiobook';

type DownloadableItem = {
  id: string;
  type: DownloadItemType;
  sourceId: string;
  sourceItemId: string;
  contentUrl?: string | null;
};

// ── Pin types ─────────────────────────────────────────

type PinEntityType = 'track' | 'album' | 'artist' | 'show' | 'audiobook' | 'playlist';

// ── Download status ───────────────────────────────────

type DownloadStatus = 'pending' | 'downloading' | 'complete' | 'error';

// ── Row schemas ───────────────────────────────────────

const downloadRowSchema = z.object({
  itemId: z.string(),
  itemType: z.enum(['track', 'episode', 'audiobook']),
  sourceId: z.string(),
  status: z.enum(['pending', 'downloading', 'complete', 'error']),
  filePath: z.string().nullish(),
  fileSize: z.number().nullish(),
  retryCount: z.number().default(0),
  errorMessage: z.string().nullish(),
  downloadedAt: z.string().nullish(),
  syncedAt: z.string().nullish(),
});

type DownloadRow = z.infer<typeof downloadRowSchema>;

const pinRowSchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  sourceId: z.string(),
  createdAt: z.string(),
});

type PinRow = z.infer<typeof pinRowSchema>;

// ── Download stats ────────────────────────────────────

type DownloadStats = {
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  errorItems: number;
  totalBytes: number;
};

// ── Events ────────────────────────────────────────────

type DownloadServiceEvents = {
  downloadCompleted: (itemId: string, itemType: DownloadItemType) => void;
  downloadFailed: (itemId: string, itemType: DownloadItemType) => void;
  statusChanged: () => void;
  pinChanged: () => void;
};

export type {
  DownloadItemType,
  DownloadableItem,
  PinEntityType,
  DownloadStatus,
  DownloadRow,
  PinRow,
  DownloadStats,
  DownloadServiceEvents,
};
export { downloadRowSchema, pinRowSchema };
