import { EventEmitter } from "@/src/utils/utils.event-emitter";

import type { AlbumRow, TrackRow } from "../database/database.schemas";
import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";
import { SyncService } from "../sync/sync";

type AlbumsServiceEvents = {
  changed: () => void;
};

class AlbumsService extends EventEmitter<AlbumsServiceEvents> {
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

  public findAll = async (): Promise<AlbumRow[]> => {
    const db = await this.#db();
    return db.sql<AlbumRow>`SELECT * FROM albums ORDER BY title ASC`;
  };

  public findById = async (id: string): Promise<AlbumRow | null> => {
    const db = await this.#db();
    return db.sql<AlbumRow>`SELECT * FROM albums WHERE id = ${id}`.first();
  };

  public findByArtist = async (artistName: string): Promise<AlbumRow[]> => {
    const db = await this.#db();
    return db.sql<AlbumRow>`SELECT * FROM albums WHERE artistName = ${artistName} ORDER BY year DESC, title ASC`;
  };

  public getTracks = async (albumId: string): Promise<TrackRow[]> => {
    const db = await this.#db();
    return db.sql<TrackRow>`SELECT * FROM tracks WHERE albumId = ${albumId} ORDER BY discNumber ASC, trackNumber ASC`;
  };
}

export { AlbumsService };
