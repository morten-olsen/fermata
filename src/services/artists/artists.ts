import { EventEmitter } from "@/src/utils/utils.event-emitter";

import type { ArtistRow } from "../database/database.schemas";
import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";
import { SyncService } from "../sync/sync";

type ArtistsServiceEvents = {
  changed: () => void;
};

class ArtistsService extends EventEmitter<ArtistsServiceEvents> {
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

  public findAll = async (): Promise<ArtistRow[]> => {
    const db = await this.#db();
    return db.sql<ArtistRow>`SELECT * FROM artists ORDER BY name ASC`;
  };
}

export { ArtistsService };
