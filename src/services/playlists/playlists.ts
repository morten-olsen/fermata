import { EventEmitter } from "@/src/utils/utils.event-emitter";
import { generateRandomId } from "@/src/utils/utils.id";

import type { PlaylistRow, TrackRow } from "../database/database.schemas";
import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";

type PlaylistsServiceEvents = {
  changed: () => void;
};

type PlaylistTrackRow = TrackRow & { position: number };

class PlaylistsService extends EventEmitter<PlaylistsServiceEvents> {
  #services: Services;

  constructor(services: Services) {
    super();
    this.#services = services;
  }

  #db = async () => {
    const databaseService = this.#services.get(DatabaseService);
    return databaseService.getInstance();
  };

  // ── Read ────────────────────────────────────────────

  public findAll = async (): Promise<PlaylistRow[]> => {
    const db = await this.#db();
    return db.sql<PlaylistRow>`SELECT * FROM playlists ORDER BY updatedAt DESC`;
  };

  public findAllWithCount = async (): Promise<Array<PlaylistRow & { trackCount: number }>> => {
    const db = await this.#db();
    type Row = PlaylistRow & { trackCount: number };
    return db.sql<Row>`
      SELECT p.*, (SELECT count(*) FROM playlistTracks pt WHERE pt.playlistId = p.id) as trackCount
      FROM playlists p
      ORDER BY p.updatedAt DESC
    `;
  };

  public findById = async (id: string): Promise<PlaylistRow | null> => {
    const db = await this.#db();
    return db.sql<PlaylistRow>`SELECT * FROM playlists WHERE id = ${id}`.first();
  };

  public getTracks = async (playlistId: string): Promise<PlaylistTrackRow[]> => {
    const db = await this.#db();
    return db.sql<PlaylistTrackRow>`
      SELECT t.*, pt.position
      FROM playlistTracks pt
      INNER JOIN tracks t ON t.id = pt.trackId
      WHERE pt.playlistId = ${playlistId}
      ORDER BY pt.position ASC
    `;
  };

  // ── Write ───────────────────────────────────────────

  public create = async (name: string, sourceId?: string, sourceItemId?: string): Promise<string> => {
    const db = await this.#db();
    const id = generateRandomId();
    const now = new Date().toISOString();

    await db.sql`
      INSERT INTO playlists (id, sourceId, sourceItemId, name, trackCount, createdAt, updatedAt, syncedAt)
      VALUES (${id}, ${sourceId ?? null}, ${sourceItemId ?? null}, ${name}, 0, ${now}, ${now}, ${sourceId ? now : null})
    `;
    await db.save();
    this.emit('changed');
    return id;
  };

  public remove = async (id: string) => {
    const db = await this.#db();
    await db.sql`DELETE FROM playlistTracks WHERE playlistId = ${id}`;
    await db.sql`DELETE FROM playlists WHERE id = ${id}`;
    await db.save();
    this.emit('changed');
  };

  public addTrack = async (playlistId: string, trackId: string) => {
    const db = await this.#db();
    const now = new Date().toISOString();

    // Get next position
    type CountRow = { count: number };
    const row = await db.sql<CountRow>`
      SELECT count(*) as count FROM playlistTracks WHERE playlistId = ${playlistId}
    `.first();
    const position = (row?.count ?? 0);

    await db.sql`
      INSERT OR IGNORE INTO playlistTracks (playlistId, trackId, position, addedAt)
      VALUES (${playlistId}, ${trackId}, ${position}, ${now})
    `;
    await db.sql`UPDATE playlists SET updatedAt = ${now} WHERE id = ${playlistId}`;
    await db.save();
    this.emit('changed');
  };

  public removeTrack = async (playlistId: string, trackId: string) => {
    const db = await this.#db();
    const now = new Date().toISOString();

    // Get the position being removed
    type PosRow = { position: number };
    const posRow = await db.sql<PosRow>`
      SELECT position FROM playlistTracks WHERE playlistId = ${playlistId} AND trackId = ${trackId}
    `.first();

    await db.sql`DELETE FROM playlistTracks WHERE playlistId = ${playlistId} AND trackId = ${trackId}`;

    // Renumber positions after the removed track
    if (posRow) {
      await db.sql`
        UPDATE playlistTracks SET position = position - 1
        WHERE playlistId = ${playlistId} AND position > ${posRow.position}
      `;
    }

    await db.sql`UPDATE playlists SET updatedAt = ${now} WHERE id = ${playlistId}`;
    await db.save();
    this.emit('changed');
  };
}

export { PlaylistsService };
export type { PlaylistTrackRow };
