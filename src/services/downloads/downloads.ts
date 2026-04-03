import { generateRandomId } from "@/src/utils/utils.id";
import { EventEmitter } from "@/src/utils/utils.event-emitter";

import { log, warn } from "@/src/shared/lib/log";

import { DatabaseService } from "../database/database.service";
import { FileSystemService } from "../filesystem/filesystem";
import type { Services } from "../services/services";
import { SourcesService } from "../sources/sources";

import type {
  DownloadableItem,
  DownloadItemType,
  DownloadRow,
  DownloadServiceEvents,
  DownloadStats,
  DownloadStatus,
  PinEntityType,
  PinRow,
} from "./downloads.types";

const DOWNLOAD_DIR = ['downloads', 'audio'] as const;
const MAX_RETRIES = 3;

class DownloadService extends EventEmitter<DownloadServiceEvents> {
  #services: Services;

  /** In-memory cache: `${itemId}:${itemType}` → file URI */
  #fileCache = new Map<string, string>();
  /** In-memory set of items queued (pending or downloading) */
  #queuedSet = new Set<string>();
  #isProcessing = false;
  #offlineMode = false;

  constructor(services: Services) {
    super();
    this.#services = services;
  }

  #db = async () => {
    const databaseService = this.#services.get(DatabaseService);
    return databaseService.getInstance();
  };

  #fs = () => this.#services.get(FileSystemService);

  #key = (itemId: string, itemType: DownloadItemType) => `${itemId}:${itemType}`;

  public get offlineMode() { return this.#offlineMode; }
  public setOfflineMode = (enabled: boolean) => {
    this.#offlineMode = enabled;
    this.emit('statusChanged');
  };

  // ── Initialization ──────────────────────────────────

  public initialize = async () => {
    const db = await this.#db();

    // Populate file cache from completed downloads
    const completed = await db.sql<Pick<DownloadRow, 'itemId' | 'itemType' | 'filePath'>>`
      SELECT itemId, itemType, filePath FROM downloads WHERE status = 'complete'
    `;
    this.#fileCache.clear();
    for (const row of completed) {
      if (row.filePath) {
        this.#fileCache.set(this.#key(row.itemId, row.itemType), row.filePath);
      }
    }

    // Populate queued set
    const pending = await db.sql<Pick<DownloadRow, 'itemId' | 'itemType'>>`
      SELECT itemId, itemType FROM downloads WHERE status IN ('pending', 'downloading')
    `;
    this.#queuedSet.clear();
    for (const row of pending) {
      this.#queuedSet.add(this.#key(row.itemId, row.itemType));
    }

    // Reset stuck downloads (in-progress from previous session)
    await db.sql`UPDATE downloads SET status = 'pending' WHERE status = 'downloading'`;
    await db.save();

    log('Download cache loaded:', this.#fileCache.size, 'downloaded,', this.#queuedSet.size, 'queued');
  };

  // ── Queries ─────────────────────────────────────────

  public isDownloaded = (itemId: string, itemType: DownloadItemType): boolean =>
    this.#fileCache.has(this.#key(itemId, itemType));

  public isQueued = (itemId: string, itemType: DownloadItemType): boolean =>
    this.#queuedSet.has(this.#key(itemId, itemType));

  public getFilePath = (itemId: string, itemType: DownloadItemType): string | undefined =>
    this.#fileCache.get(this.#key(itemId, itemType));

  public getStats = async (): Promise<DownloadStats> => {
    const db = await this.#db();
    type StatsRow = {
      totalItems: number;
      completedItems: number;
      pendingItems: number;
      errorItems: number;
      totalBytes: number;
    };

    const row = await db.sql<StatsRow>`
      SELECT
        count(*) as totalItems,
        sum(case when status = 'complete' then 1 else 0 end) as completedItems,
        sum(case when status = 'pending' then 1 else 0 end) as pendingItems,
        sum(case when status = 'error' then 1 else 0 end) as errorItems,
        coalesce(sum(case when status = 'complete' then fileSize else 0 end), 0) as totalBytes
      FROM downloads
    `.first();

    return {
      totalItems: row?.totalItems ?? 0,
      completedItems: row?.completedItems ?? 0,
      pendingItems: row?.pendingItems ?? 0,
      errorItems: row?.errorItems ?? 0,
      totalBytes: row?.totalBytes ?? 0,
    };
  };

  public getDownloadsForSource = async (sourceId: string): Promise<DownloadRow[]> => {
    const db = await this.#db();
    return db.sql<DownloadRow>`SELECT * FROM downloads WHERE sourceId = ${sourceId}`;
  };

  // ── Pin management ──────────────────────────────────

  public isPinned = async (entityType: PinEntityType, entityId: string): Promise<boolean> => {
    const db = await this.#db();
    const row = await db.sql<PinRow>`
      SELECT * FROM offlinePins WHERE entityType = ${entityType} AND entityId = ${entityId}
    `.first();
    return !!row;
  };

  public pin = async (entityType: PinEntityType, entityId: string, sourceId: string) => {
    const db = await this.#db();
    const id = generateRandomId();

    await db.sql`
      INSERT OR IGNORE INTO offlinePins (id, entityType, entityId, sourceId, createdAt)
      VALUES (${id}, ${entityType}, ${entityId}, ${sourceId}, ${new Date().toISOString()})
    `;
    await db.save();

    // Resolve the pin to downloadable items and enqueue them
    const items = await this.#resolvePin(entityType, entityId, sourceId);
    for (const item of items) {
      await this.#enqueue(item);
    }

    this.emit('pinChanged');
    this.emit('statusChanged');
    this.processQueue();
  };

  public unpin = async (entityType: PinEntityType, entityId: string) => {
    const db = await this.#db();

    await db.sql`
      DELETE FROM offlinePins WHERE entityType = ${entityType} AND entityId = ${entityId}
    `;
    await db.save();

    // Remove orphaned downloads
    const orphans = await this.#findOrphans();
    for (const orphan of orphans) {
      await this.removeDownload(orphan.itemId, orphan.itemType);
    }

    this.emit('pinChanged');
    this.emit('statusChanged');
  };

  public getPins = async (): Promise<PinRow[]> => {
    const db = await this.#db();
    return db.sql<PinRow>`SELECT * FROM offlinePins`;
  };

  // ── Download management ─────────────────────────────

  public enqueueItem = async (item: DownloadableItem) => {
    await this.#enqueue(item);
    this.emit('statusChanged');
    this.processQueue();
  };

  public removeDownload = async (itemId: string, itemType: DownloadItemType) => {
    const key = this.#key(itemId, itemType);
    const fs = this.#fs();
    const filename = `${itemId}.${itemType}`;

    try {
      const exists = await fs.fileExists(...DOWNLOAD_DIR, filename);
      if (exists) await fs.deleteFile(...DOWNLOAD_DIR, filename);
    } catch {
      // File already gone
    }

    const db = await this.#db();
    await db.sql`DELETE FROM downloads WHERE itemId = ${itemId} AND itemType = ${itemType}`;
    await db.save();

    this.#fileCache.delete(key);
    this.#queuedSet.delete(key);
  };

  public removeAllDownloads = async () => {
    const fs = this.#fs();
    try {
      await fs.deleteDir(...DOWNLOAD_DIR);
    } catch {
      // Directory already gone
    }

    const db = await this.#db();
    await db.sql`DELETE FROM downloads`;
    await db.sql`DELETE FROM offlinePins`;
    await db.save();

    this.#fileCache.clear();
    this.#queuedSet.clear();
    this.emit('pinChanged');
    this.emit('statusChanged');
  };

  public retryFailed = async () => {
    const db = await this.#db();
    await db.sql`UPDATE downloads SET status = 'pending', retryCount = 0 WHERE status = 'error'`;
    await db.save();

    // Rebuild queued set for retried items
    const retried = await db.sql<Pick<DownloadRow, 'itemId' | 'itemType'>>`
      SELECT itemId, itemType FROM downloads WHERE status = 'pending'
    `;
    for (const row of retried) {
      this.#queuedSet.add(this.#key(row.itemId, row.itemType));
    }

    this.emit('statusChanged');
    this.processQueue();
  };

  public removeBySource = async (sourceId: string) => {
    const db = await this.#db();
    const rows = await db.sql<Pick<DownloadRow, 'itemId' | 'itemType'>>`
      SELECT itemId, itemType FROM downloads WHERE sourceId = ${sourceId}
    `;

    for (const row of rows) {
      await this.removeDownload(row.itemId, row.itemType);
    }

    await db.sql`DELETE FROM offlinePins WHERE sourceId = ${sourceId}`;
    await db.save();
    this.emit('pinChanged');
    this.emit('statusChanged');
  };

  // ── Queue processing ────────────────────────────────

  public processQueue = () => {
    if (this.#isProcessing) return;
    this.#isProcessing = true;

    const fs = this.#fs();
    fs.ensureDir(...DOWNLOAD_DIR).then(() => {
      this.#scheduleNext();
    });
  };

  #scheduleNext = () => {
    setTimeout(async () => {
      const db = await this.#db();
      type PendingRow = { itemId: string; itemType: DownloadItemType; sourceId: string };
      const pending = await db.sql<PendingRow>`
        SELECT itemId, itemType, sourceId FROM downloads WHERE status = 'pending' ORDER BY rowid ASC LIMIT 1
      `;

      if (pending.length === 0) {
        this.#isProcessing = false;
        log('Download queue complete');
        this.emit('statusChanged');
        return;
      }

      const item = pending[0];
      await this.#downloadItem(item.itemId, item.itemType, item.sourceId);
      this.emit('statusChanged');
      this.#scheduleNext();
    }, 0);
  };

  // ── Private helpers ─────────────────────────────────

  #enqueue = async (item: DownloadableItem) => {
    const db = await this.#db();
    await db.sql`
      INSERT OR IGNORE INTO downloads (itemId, itemType, sourceId, status, retryCount)
      VALUES (${item.id}, ${item.type}, ${item.sourceId}, 'pending', 0)
    `;
    await db.save();
    this.#queuedSet.add(this.#key(item.id, item.type));
  };

  #downloadItem = async (itemId: string, itemType: DownloadItemType, sourceId: string) => {
    const db = await this.#db();
    const key = this.#key(itemId, itemType);

    // Resolve source adapter
    const sourcesService = this.#services.get(SourcesService);
    const source = await sourcesService.findById(sourceId);
    if (!source) {
      warn('Download: source not found', sourceId);
      await db.sql`
        UPDATE downloads SET status = 'error', errorMessage = 'Source not found'
        WHERE itemId = ${itemId} AND itemType = ${itemType}
      `;
      await db.save();
      this.#queuedSet.delete(key);
      this.emit('downloadFailed', itemId, itemType);
      return;
    }

    const adapter = sourcesService.getAdapter(source);

    // Resolve stream URL based on item type
    const streamInfo = await this.#resolveStreamInfo(itemId, itemType);
    if (!streamInfo) {
      await db.sql`
        UPDATE downloads SET status = 'error', errorMessage = 'Item not found in library'
        WHERE itemId = ${itemId} AND itemType = ${itemType}
      `;
      await db.save();
      this.#queuedSet.delete(key);
      this.emit('downloadFailed', itemId, itemType);
      return;
    }

    const url = await adapter.getStreamUrl(streamInfo.sourceItemId, streamInfo.contentUrl);
    const filename = `${itemId}.${itemType}`;

    this.#queuedSet.add(key);
    log('Downloading:', streamInfo.title);
    await db.sql`
      UPDATE downloads SET status = 'downloading'
      WHERE itemId = ${itemId} AND itemType = ${itemType}
    `;
    await db.save();

    try {
      const fs = this.#fs();
      await fs.ensureDir(...DOWNLOAD_DIR);
      const { uri, size } = await fs.downloadFile(url, ...DOWNLOAD_DIR, filename);

      await db.sql`
        UPDATE downloads
        SET status = 'complete', filePath = ${uri}, fileSize = ${size},
            downloadedAt = ${new Date().toISOString()}, syncedAt = ${streamInfo.syncedAt}
        WHERE itemId = ${itemId} AND itemType = ${itemType}
      `;
      await db.save();

      this.#fileCache.set(key, uri);
      this.#queuedSet.delete(key);
      log('Downloaded:', streamInfo.title, `(${(size / 1024 / 1024).toFixed(1)} MB)`);
      this.emit('downloadCompleted', itemId, itemType);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Download failed';
      warn('Download failed:', streamInfo.title, msg);

      const dl = await db.sql<Pick<DownloadRow, 'retryCount'>>`
        SELECT retryCount FROM downloads WHERE itemId = ${itemId} AND itemType = ${itemType}
      `.first();
      const retries = (dl?.retryCount ?? 0) + 1;

      if (retries < MAX_RETRIES) {
        await db.sql`
          UPDATE downloads SET status = 'pending', retryCount = ${retries}, errorMessage = ${msg}
          WHERE itemId = ${itemId} AND itemType = ${itemType}
        `;
      } else {
        this.#queuedSet.delete(key);
        await db.sql`
          UPDATE downloads SET status = 'error', retryCount = ${retries}, errorMessage = ${msg}
          WHERE itemId = ${itemId} AND itemType = ${itemType}
        `;
        this.emit('downloadFailed', itemId, itemType);
      }
      await db.save();
    }
  };

  #resolveStreamInfo = async (
    itemId: string,
    itemType: DownloadItemType,
  ): Promise<{ sourceItemId: string; contentUrl?: string | null; title: string; syncedAt: string } | null> => {
    const db = await this.#db();

    type InfoRow = { sourceItemId: string; contentUrl?: string | null; title: string; syncedAt: string };

    if (itemType === 'track') {
      return db.sql<InfoRow>`
        SELECT sourceItemId, NULL as contentUrl, title, syncedAt FROM tracks WHERE id = ${itemId}
      `.first();
    }

    if (itemType === 'episode') {
      return db.sql<InfoRow>`
        SELECT sourceItemId, contentUrl, title, syncedAt FROM episodes WHERE id = ${itemId}
      `.first();
    }

    if (itemType === 'audiobook') {
      return db.sql<InfoRow>`
        SELECT sourceItemId, NULL as contentUrl, title, syncedAt FROM audiobooks WHERE id = ${itemId}
      `.first();
    }

    return null;
  };

  #resolvePin = async (
    entityType: PinEntityType,
    entityId: string,
    sourceId: string,
  ): Promise<DownloadableItem[]> => {
    const db = await this.#db();

    type ItemRow = { id: string; sourceItemId: string; contentUrl?: string | null };

    if (entityType === 'track') {
      const row = await db.sql<ItemRow>`
        SELECT id, sourceItemId, NULL as contentUrl FROM tracks WHERE id = ${entityId}
      `.first();
      return row ? [{ id: row.id, type: 'track', sourceId, sourceItemId: row.sourceItemId, contentUrl: row.contentUrl }] : [];
    }

    if (entityType === 'album') {
      const rows = await db.sql<ItemRow>`
        SELECT id, sourceItemId, NULL as contentUrl FROM tracks WHERE albumId = ${entityId}
      `;
      return rows.map((r) => ({ id: r.id, type: 'track' as const, sourceId, sourceItemId: r.sourceItemId, contentUrl: r.contentUrl }));
    }

    if (entityType === 'artist') {
      const rows = await db.sql<ItemRow>`
        SELECT t.id, t.sourceItemId, NULL as contentUrl FROM tracks t
        INNER JOIN albums a ON a.id = t.albumId
        WHERE a.artistName = ${entityId}
      `;
      return rows.map((r) => ({ id: r.id, type: 'track' as const, sourceId, sourceItemId: r.sourceItemId, contentUrl: r.contentUrl }));
    }

    if (entityType === 'show') {
      const rows = await db.sql<ItemRow>`
        SELECT id, sourceItemId, contentUrl FROM episodes WHERE showId = ${entityId}
      `;
      return rows.map((r) => ({ id: r.id, type: 'episode' as const, sourceId, sourceItemId: r.sourceItemId, contentUrl: r.contentUrl }));
    }

    if (entityType === 'audiobook') {
      const row = await db.sql<ItemRow>`
        SELECT id, sourceItemId, NULL as contentUrl FROM audiobooks WHERE id = ${entityId}
      `.first();
      return row ? [{ id: row.id, type: 'audiobook', sourceId, sourceItemId: row.sourceItemId, contentUrl: row.contentUrl }] : [];
    }

    if (entityType === 'playlist') {
      const rows = await db.sql<ItemRow>`
        SELECT t.id, t.sourceItemId, NULL as contentUrl FROM tracks t
        INNER JOIN playlistTracks pt ON pt.trackId = t.id
        WHERE pt.playlistId = ${entityId}
      `;
      return rows.map((r) => ({ id: r.id, type: 'track' as const, sourceId, sourceItemId: r.sourceItemId, contentUrl: r.contentUrl }));
    }

    return [];
  };

  #findOrphans = async (): Promise<Array<{ itemId: string; itemType: DownloadItemType }>> => {
    const db = await this.#db();

    type OrphanRow = { itemId: string; itemType: DownloadItemType };

    return db.sql<OrphanRow>`
      SELECT d.itemId, d.itemType FROM downloads d
      WHERE NOT EXISTS (
        -- Individually pinned items (track, audiobook)
        SELECT 1 FROM offlinePins op
        WHERE op.entityType = d.itemType AND op.entityId = d.itemId
      )
      AND NOT EXISTS (
        -- Tracks belonging to pinned albums
        SELECT 1 FROM tracks t
        INNER JOIN offlinePins op ON op.entityType = 'album' AND op.entityId = t.albumId
        WHERE d.itemType = 'track' AND d.itemId = t.id
      )
      AND NOT EXISTS (
        -- Tracks belonging to pinned artists
        SELECT 1 FROM tracks t
        INNER JOIN albums a ON a.id = t.albumId
        INNER JOIN offlinePins op ON op.entityType = 'artist' AND op.entityId = a.artistName
        WHERE d.itemType = 'track' AND d.itemId = t.id
      )
      AND NOT EXISTS (
        -- Episodes belonging to pinned shows
        SELECT 1 FROM episodes e
        INNER JOIN offlinePins op ON op.entityType = 'show' AND op.entityId = e.showId
        WHERE d.itemType = 'episode' AND d.itemId = e.id
      )
      AND NOT EXISTS (
        -- Tracks belonging to pinned playlists
        SELECT 1 FROM playlistTracks pt
        INNER JOIN offlinePins op ON op.entityType = 'playlist' AND op.entityId = pt.playlistId
        WHERE d.itemType = 'track' AND d.itemId = pt.trackId
      )
    `;
  };
}

export { DownloadService };
