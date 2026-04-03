import { EventEmitter } from "@/src/utils/utils.event-emitter";

import type { TrackRow } from "../database/database.schemas";
import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";
import { SyncService } from "../sync/sync";

type TracksServiceEvents = {
  changed: () => void;
};

class TracksService extends EventEmitter<TracksServiceEvents> {
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

  public findAll = async (): Promise<TrackRow[]> => {
    const db = await this.#db();
    return db.sql<TrackRow>`SELECT * FROM tracks ORDER BY title ASC`;
  };

  public findById = async (id: string): Promise<TrackRow | null> => {
    const db = await this.#db();
    return db.sql<TrackRow>`SELECT * FROM tracks WHERE id = ${id}`.first();
  };
}

export { TracksService };
