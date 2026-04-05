import { generateRandomId } from "@/src/utils/utils.id";
import { EventEmitter } from "@/src/utils/utils.event-emitter";

import type { SourceRow } from "../database/database.schemas";
import { sourceRowSchema } from "../database/database.schemas";
import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";

import type { SourceAdapter } from "./sources.adapter";
import type { SourceCredentials } from "./sources.registry";
import { createAdapter, authenticateSource } from "./sources.registry";

type SourcesServiceEvents = {
  sourceAdded: (item: SourceRow) => void;
  sourceRemoved: (item: SourceRow) => void;
  sourceUpdated: (item: SourceRow) => void;
  sourceAuthExpired: (sourceId: string) => void;
}

type RawSourceRow = {
  id: string;
  type: string;
  name: string | null;
  config: string;
  lastSyncedAt: string | null;
};

const parseRow = (row: RawSourceRow): SourceRow =>
  sourceRowSchema.parse({
    ...row,
    config: JSON.parse(row.config) as unknown,
  });

class SourcesService extends EventEmitter<SourcesServiceEvents> {
  #services: Services;
  #expiredSources = new Set<string>();

  constructor(services: Services) {
    super();
    this.#services = services;
  }

  #db = async () => {
    const databaseService = this.#services.get(DatabaseService);
    return databaseService.getInstance();
  };

  public findAll = async (): Promise<SourceRow[]> => {
    const db = await this.#db();
    const rows = await db.sql<RawSourceRow>`SELECT * FROM sources`;
    return rows.map(parseRow);
  };

  public findById = async (id: string): Promise<SourceRow | null> => {
    const db = await this.#db();
    const row = await db.sql<RawSourceRow>`SELECT * FROM sources WHERE id = ${id}`.first();
    return row ? parseRow(row) : null;
  };

  public add = async (item: Omit<SourceRow, 'id'>): Promise<SourceRow> => {
    const id = generateRandomId();
    const db = await this.#db();

    await db.sql`
      INSERT INTO sources (id, type, name, config, lastSyncedAt)
      VALUES (${id}, ${item.type}, ${item.name ?? null}, ${JSON.stringify(item.config)}, ${item.lastSyncedAt ?? null})
    `;

    const source: SourceRow = { ...item, id } as SourceRow;
    await db.save();
    this.emit('sourceAdded', source);
    return source;
  };

  public update = async (id: string, updates: Partial<Pick<SourceRow, 'name' | 'config' | 'lastSyncedAt'>>): Promise<SourceRow | null> => {
    const existing = await this.findById(id);
    if (!existing) return null;
    const db = await this.#db();

    const merged: SourceRow = {
      ...existing,
      ...updates.name !== undefined && { name: updates.name },
      ...updates.config !== undefined && { config: updates.config },
      ...updates.lastSyncedAt !== undefined && { lastSyncedAt: updates.lastSyncedAt },
    } as SourceRow;

    await db.sql`
      UPDATE sources
      SET name = ${merged.name ?? null},
          config = ${JSON.stringify(merged.config)},
          lastSyncedAt = ${merged.lastSyncedAt ?? null}
      WHERE id = ${id}
    `;

    await db.save();
    this.emit('sourceUpdated', merged);
    return merged;
  };

  public authenticate = (type: string, credentials: SourceCredentials) =>
    authenticateSource(type, credentials);

  public addFromCredentials = async (params: {
    type: 'jellyfin' | 'audiobookshelf';
    name: string;
    credentials: SourceCredentials;
  }): Promise<SourceRow> => {
    const config = await authenticateSource(params.type, params.credentials);
    return this.add({ type: params.type, name: params.name, config, lastSyncedAt: null });
  };

  public getAdapter = (source: SourceRow): SourceAdapter => createAdapter(source);

  // ── Auth state ──────────────────────────────────────

  public markAuthExpired = (sourceId: string) => {
    if (this.#expiredSources.has(sourceId)) return;
    this.#expiredSources.add(sourceId);
    this.emit('sourceAuthExpired', sourceId);
  };

  public clearAuthExpired = (sourceId: string) => {
    this.#expiredSources.delete(sourceId);
  };

  public isAuthExpired = (sourceId: string): boolean =>
    this.#expiredSources.has(sourceId);

  public reAuthenticate = async (sourceId: string, credentials: SourceCredentials): Promise<void> => {
    const source = await this.findById(sourceId);
    if (!source) throw new Error('Source not found');
    const config = await authenticateSource(source.type, credentials);
    await this.update(sourceId, { config });
    this.clearAuthExpired(sourceId);
  };

  public remove = async (id: string): Promise<boolean> => {
    const existing = await this.findById(id);
    if (!existing) return false;
    const db = await this.#db();

    await db.sql`DELETE FROM sources WHERE id = ${id}`;

    await db.save();
    this.emit('sourceRemoved', existing);
    return true;
  };
}

export { SourcesService };
