import { EventEmitter } from "@/src/utils/utils.event-emitter";

import type { ArtistRow } from "../database/database.schemas";
import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";

type ArtistsServiceEvents = {
  changed: () => void;
};

class ArtistsService extends EventEmitter<ArtistsServiceEvents> {
  #services: Services;

  constructor(services: Services) {
    super();
    this.#services = services;
  }

  #db = async () => {
    const databaseService = this.#services.get(DatabaseService);
    return databaseService.getInstance();
  };

  public findAll = async (): Promise<ArtistRow[]> => {
    const db = await this.#db();
    return db.sql<ArtistRow>`SELECT * FROM artists ORDER BY name ASC`;
  };

  public search = async (query: string, limit = 20): Promise<ArtistRow[]> => {
    const db = await this.#db();
    const pattern = `%${query}%`;
    return db.sql<ArtistRow>`
      SELECT * FROM artists
      WHERE name LIKE ${pattern}
      ORDER BY name ASC LIMIT ${limit}
    `;
  };
}

export { ArtistsService };
