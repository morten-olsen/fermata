import { EventEmitter } from "@/src/utils/utils.event-emitter";

import type { AudiobookRow } from "../database/database.schemas";
import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";
import { SyncService } from "../sync/sync";

type AudiobooksServiceEvents = {
  changed: () => void;
};

class AudiobooksService extends EventEmitter<AudiobooksServiceEvents> {
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

  static #parseChapters(row: AudiobookRow): AudiobookRow {
    if (typeof row.chapters === 'string') {
      row.chapters = JSON.parse(row.chapters) as AudiobookRow['chapters'];
    }
    return row;
  }

  public findAll = async (): Promise<AudiobookRow[]> => {
    const db = await this.#db();
    const rows = await db.sql<AudiobookRow>`SELECT * FROM audiobooks ORDER BY title ASC`;
    return rows.map(AudiobooksService.#parseChapters);
  };

  public findById = async (id: string): Promise<AudiobookRow | null> => {
    const db = await this.#db();
    const row = await db.sql<AudiobookRow>`SELECT * FROM audiobooks WHERE id = ${id}`.first();
    return row ? AudiobooksService.#parseChapters(row) : null;
  };
}

export { AudiobooksService };
