import { EventEmitter } from "@/src/utils/utils.event-emitter";

import type { ShowRow, EpisodeRow } from "../database/database.schemas";
import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";
import { SyncService } from "../sync/sync";

type ShowsServiceEvents = {
  changed: () => void;
};

class ShowsService extends EventEmitter<ShowsServiceEvents> {
  #services: Services;

  constructor(services: Services) {
    super();
    this.#services = services;

    const syncService = this.#services.get(SyncService);
    syncService.on('syncCompleted', () => {
      this.emit('changed');
    });
  }

  #db = async () => {
    const databaseService = this.#services.get(DatabaseService);
    return databaseService.getInstance();
  };

  public findAll = async (): Promise<ShowRow[]> => {
    const db = await this.#db();
    return db.sql<ShowRow>`SELECT * FROM shows ORDER BY title ASC`;
  };

  public findById = async (id: string): Promise<ShowRow | null> => {
    const db = await this.#db();
    return db.sql<ShowRow>`SELECT * FROM shows WHERE id = ${id}`.first();
  };

  public getEpisodes = async (showId: string): Promise<EpisodeRow[]> => {
    const db = await this.#db();
    return db.sql<EpisodeRow>`SELECT * FROM episodes WHERE showId = ${showId} ORDER BY publishedAt DESC, episodeNumber DESC`;
  };
}

export { ShowsService };
