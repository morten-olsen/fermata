import { EventEmitter } from "@/src/utils/utils.event-emitter";

import type { TrackRow } from "../database/database.schemas";
import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";

type TracksServiceEvents = {
  changed: () => void;
};

class TracksService extends EventEmitter<TracksServiceEvents> {
  #services: Services;

  constructor(services: Services) {
    super();
    this.#services = services;
  }

  #db = async () => {
    const databaseService = this.#services.get(DatabaseService);
    return databaseService.getInstance();
  };

  public findAll = async (): Promise<TrackRow[]> => {
    const db = await this.#db();
    return db.sql<TrackRow>`SELECT * FROM tracks ORDER BY title ASC`;
  };

  public findById = async (id: string): Promise<TrackRow | null> => {
    const db = await this.#db();
    return db.sql<TrackRow>`SELECT * FROM tracks WHERE id = ${id}`.first();
  };

  public toggleFavourite = async (id: string): Promise<boolean> => {
    const db = await this.#db();
    const track = await this.findById(id);
    if (!track) return false;
    const newValue = !track.isFavourite;
    await db.sql`UPDATE tracks SET isFavourite = ${newValue ? 1 : 0} WHERE id = ${id}`;
    await db.save();
    this.emit('changed');
    return newValue;
  };

  public search = async (query: string, limit = 30): Promise<TrackRow[]> => {
    const db = await this.#db();
    const pattern = `%${query}%`;
    return db.sql<TrackRow>`
      SELECT * FROM tracks
      WHERE title LIKE ${pattern} OR artistName LIKE ${pattern}
      ORDER BY title ASC LIMIT ${limit}
    `;
  };
}

export { TracksService };
