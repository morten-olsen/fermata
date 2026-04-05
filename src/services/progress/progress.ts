import { EventEmitter } from "@/src/utils/utils.event-emitter";

import { log, warn } from "@/src/shared/lib/log";

import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";
import { SourcesService } from "../sources/sources";

import type {
  AlbumProgressState,
  AlbumProgressSummary,
  ProgressEntry,
  ProgressItemChange,
  ProgressServiceEvents,
} from "./progress.types";

/** Remote push interval */
const PUSH_INTERVAL_MS = 60_000;

class ProgressService extends EventEmitter<ProgressServiceEvents> {
  #services: Services;
  #pushInterval: ReturnType<typeof setInterval> | null = null;
  #pushSourceId: string | null = null;

  constructor(services: Services) {
    super();
    this.#services = services;
  }

  #db = async () => {
    const databaseService = this.#services.get(DatabaseService);
    return databaseService.getInstance();
  };

  // ── Notify ─────────────────────────────────────────

  public notifyChanged = (change: ProgressItemChange) => {
    this.emit('changed');
    this.emit(`changed:${change.itemId}`);
    this.emit('itemChanged', change);
  };

  /** Emit only itemChanged — for real-time list updates without triggering DB refetches. */
  public emitItemChanged = (change: ProgressItemChange) => {
    this.emit('itemChanged', change);
  };

  // ── Read ────────────────────────────────────────────

  public getProgress = async (itemId: string): Promise<ProgressEntry | null> => {
    const db = await this.#db();
    type Row = { itemId: string; itemType: string; positionMs: number; durationMs: number; isCompleted: number; updatedAt: string; needsSync: number };
    const row = await db.sql<Row>`
      SELECT * FROM playbackProgress WHERE itemId = ${itemId}
    `.first();
    return row ? { ...row, isCompleted: !!row.isCompleted, needsSync: !!row.needsSync } : null;
  };

  public getProgressBatch = async (itemIds: string[]): Promise<Map<string, ProgressEntry>> => {
    if (itemIds.length === 0) return new Map();

    const entries = await Promise.all(itemIds.map((id) => this.getProgress(id)));
    const map = new Map<string, ProgressEntry>();
    for (let i = 0; i < itemIds.length; i++) {
      const entry = entries[i];
      if (entry) map.set(itemIds[i], entry);
    }
    return map;
  };

  /**
   * Per-show progress summary: how many episodes completed/started out of total.
   */
  public getShowProgressSummaries = async (showIds: string[]): Promise<Map<string, AlbumProgressSummary>> => {
    if (showIds.length === 0) return new Map();

    const db = await this.#db();
    type Row = { showId: string; total: number; completed: number; started: number };

    // Get all episodes for these shows with their progress
    const rows = await db.sql<Row>`
      SELECT
        e.showId,
        count(*) as total,
        sum(case when pp.isCompleted = 1 then 1 else 0 end) as completed,
        sum(case when pp.positionMs > 0 or pp.isCompleted = 1 then 1 else 0 end) as started
      FROM episodes e
      LEFT JOIN playbackProgress pp ON pp.itemId = e.id AND pp.itemType = 'episode'
      GROUP BY e.showId
    `;

    const idSet = new Set(showIds);
    const map = new Map<string, AlbumProgressSummary>();
    for (const row of rows) {
      if (idSet.has(row.showId)) {
        const completed = row.completed || 0;
        const started = row.started || 0;
        map.set(row.showId, {
          completed,
          started,
          total: row.total,
          fraction: row.total > 0 ? completed / row.total : 0,
        });
      }
    }
    return map;
  };

  // ── Push lifecycle ─────────────────────────────────

  public startPushInterval = (sourceId: string) => {
    this.stopPushInterval();
    this.#pushSourceId = sourceId;
    this.#pushInterval = setInterval(() => {
      void this.#pushPending();
    }, PUSH_INTERVAL_MS);
  };

  public stopPushInterval = () => {
    if (this.#pushInterval) {
      clearInterval(this.#pushInterval);
      this.#pushInterval = null;
    }
    this.#pushSourceId = null;
  };

  public pushNow = async () => {
    await this.#pushPending();
  };

  #pushPending = async () => {
    if (!this.#pushSourceId) return;
    try {
      const sourcesService = this.#services.get(SourcesService);
      const source = await sourcesService.findById(this.#pushSourceId);
      if (!source) return;
      const adapter = sourcesService.getAdapter(source);
      const count = await this.pushToSource(adapter, this.#pushSourceId);
      if (count > 0) log("Pushed", count, "progress entries to source");
    } catch (e) {
      warn("Progress push failed:", e);
    }
  };

  // ── Sync helpers ────────────────────────────────────

  /**
   * Get all progress entries with needsSync = 1 for a given source.
   * Joins with entity tables to retrieve sourceItemId.
   */
  public getPendingForSource = async (sourceId: string): Promise<Array<{
    itemId: string;
    itemType: string;
    sourceItemId: string;
    positionMs: number;
    durationMs: number;
    isCompleted: boolean;
  }>> => {
    const db = await this.#db();
    type Row = { itemId: string; itemType: string; sourceItemId: string; positionMs: number; durationMs: number; isCompleted: number };

    // Query episodes and audiobooks that need sync
    const episodes = await db.sql<Row>`
      SELECT pp.itemId, pp.itemType, e.sourceItemId, pp.positionMs, pp.durationMs, pp.isCompleted
      FROM playbackProgress pp
      INNER JOIN episodes e ON pp.itemId = e.id
      WHERE pp.needsSync = 1 AND e.sourceId = ${sourceId} AND pp.itemType = 'episode'
    `;

    const audiobooks = await db.sql<Row>`
      SELECT pp.itemId, pp.itemType, ab.sourceItemId, pp.positionMs, pp.durationMs, pp.isCompleted
      FROM playbackProgress pp
      INNER JOIN audiobooks ab ON pp.itemId = ab.id
      WHERE pp.needsSync = 1 AND ab.sourceId = ${sourceId} AND pp.itemType = 'audiobook'
    `;

    return [...episodes, ...audiobooks].map((r) => ({ ...r, isCompleted: !!r.isCompleted }));
  };

  public clearNeedsSync = async (itemIds: string[]) => {
    if (itemIds.length === 0) return;
    const db = await this.#db();
    for (const id of itemIds) {
      await db.sql`UPDATE playbackProgress SET needsSync = 0 WHERE itemId = ${id}`;
    }
    await db.save();
  };

  /**
   * Push all pending local progress to a source adapter.
   * Called during sync. Clears needsSync flags on success.
   */
  public pushToSource = async (
    adapter: { reportProgress?(sourceItemId: string, positionMs: number, durationMs: number, isCompleted: boolean): Promise<void> },
    sourceId: string,
  ): Promise<number> => {
    if (!adapter.reportProgress) return 0;

    const pending = await this.getPendingForSource(sourceId);
    if (pending.length === 0) return 0;

    const pushed: string[] = [];
    for (const entry of pending) {
      try {
        await adapter.reportProgress(entry.sourceItemId, entry.positionMs, entry.durationMs, entry.isCompleted);
        pushed.push(entry.itemId);
      } catch (e) {
        warn("Failed to push progress for:", entry.itemId, e);
      }
    }

    if (pushed.length > 0) {
      await this.clearNeedsSync(pushed);
    }

    return pushed.length;
  };

  // ── Pull ───────────────────────────────────────────

  public pullFromSource = async (
    adapter: { getProgress?(): Promise<Array<{ sourceItemId: string; positionMs: number; durationMs: number; isCompleted: boolean; updatedAt: string }>> },
    sourceId: string,
  ): Promise<number> => {
    if (!adapter.getProgress) return 0;

    const remoteEntries = await adapter.getProgress();
    const db = await this.#db();
    let updated = 0;

    for (const remote of remoteEntries) {
      const resolved = await this.#resolveLocalId(remote.sourceItemId, sourceId);
      if (!resolved) continue;

      const local = await this.getProgress(resolved.id);

      // Skip if local has unpushed changes
      if (local?.needsSync) continue;

      // Skip if local is newer or equal
      if (local && local.updatedAt >= remote.updatedAt) continue;

      // Accept remote
      await db.sql`
        INSERT INTO playbackProgress (itemId, itemType, positionMs, durationMs, isCompleted, updatedAt, needsSync)
        VALUES (${resolved.id}, ${resolved.itemType}, ${remote.positionMs}, ${remote.durationMs}, ${remote.isCompleted ? 1 : 0}, ${remote.updatedAt}, 0)
        ON CONFLICT (itemId, itemType) DO UPDATE SET
          positionMs = ${remote.positionMs},
          durationMs = ${remote.durationMs},
          isCompleted = ${remote.isCompleted ? 1 : 0},
          updatedAt = ${remote.updatedAt},
          needsSync = 0
      `;
      this.notifyChanged({
        itemId: resolved.id,
        positionMs: remote.positionMs,
        durationMs: remote.durationMs,
        isCompleted: remote.isCompleted,
      });
      updated++;
    }

    if (updated > 0) {
      await db.save();
      log("Pulled", updated, "progress entries from source");
    }
    return updated;
  };

  #resolveLocalId = async (
    sourceItemId: string,
    sourceId: string,
  ): Promise<{ id: string; itemType: string } | null> => {
    const db = await this.#db();
    type Row = { id: string };

    const ep = await db.sql<Row>`
      SELECT id FROM episodes WHERE sourceItemId = ${sourceItemId} AND sourceId = ${sourceId}
    `.first();
    if (ep) return { id: ep.id, itemType: 'episode' };

    const ab = await db.sql<Row>`
      SELECT id FROM audiobooks WHERE sourceItemId = ${sourceItemId} AND sourceId = ${sourceId}
    `.first();
    if (ab) return { id: ab.id, itemType: 'audiobook' };

    return null;
  };

  // ── Foreground sync ───────────────────────────────

  public initialize = () => {
    const RN = require("react-native") as { AppState: { addEventListener(type: string, handler: (state: string) => void): void } };
    RN.AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void this.#pullAllSources();
      }
    });
  };

  #pullAllSources = async () => {
    try {
      const sourcesService = this.#services.get(SourcesService);
      const sources = await sourcesService.findAll();
      for (const source of sources) {
        const adapter = sourcesService.getAdapter(source);
        await this.pushToSource(adapter, source.id);
        await this.pullFromSource(adapter, source.id);
      }
    } catch (e) {
      warn("Foreground progress sync failed:", e);
    }
  };

  // ── Pure helpers (static) ───────────────────────────

  /**
   * Classify shows/audiobooks as none / in_progress / finished.
   */
  static classifyProgress(
    ids: string[],
    summaries: Map<string, AlbumProgressSummary>,
  ): Map<string, AlbumProgressState> {
    const states = new Map<string, AlbumProgressState>();
    for (const id of ids) {
      const s = summaries.get(id);
      if (!s || s.started === 0) {
        states.set(id, 'none');
      } else if (s.fraction >= 1 && s.total > 0) {
        states.set(id, 'finished');
      } else {
        states.set(id, 'in_progress');
      }
    }
    return states;
  }

  /**
   * Compute per-chapter progress from a single audiobook's position.
   */
  static computeBookChapterProgress(
    chapters: Array<{ title: string; startMs: number; endMs: number }>,
    bookPositionMs: number,
    bookCompleted: boolean,
  ): Map<number, { fraction: number; isCompleted: boolean }> {
    const map = new Map<number, { fraction: number; isCompleted: boolean }>();

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      const chDurationMs = ch.endMs - ch.startMs;

      if (bookCompleted || bookPositionMs >= ch.endMs) {
        map.set(i, { fraction: 1, isCompleted: true });
      } else if (bookPositionMs > ch.startMs && chDurationMs > 0) {
        const chapterPos = bookPositionMs - ch.startMs;
        map.set(i, { fraction: chapterPos / chDurationMs, isCompleted: false });
      }
    }

    return map;
  }
}

export { ProgressService };
