import { EventEmitter } from "@/src/utils/utils.event-emitter";

import type { ShowRow, EpisodeRow } from "../database/database.schemas";
import { DatabaseService } from "../database/database.service";
import type { Services } from "../services/services";

type LatestEpisode = {
  id: string;
  title: string;
  duration: number;
  publishedAt: string | null;
  showId: string;
  showTitle: string;
  showArtworkUri: string | null;
};

type ShowsServiceEvents = {
  changed: () => void;
};

class ShowsService extends EventEmitter<ShowsServiceEvents> {
  #services: Services;

  constructor(services: Services) {
    super();
    this.#services = services;
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

  public getLatestUnplayed = async (limit = 10): Promise<LatestEpisode[]> => {
    const db = await this.#db();
    return db.sql<LatestEpisode>`
      SELECT
        e.id, e.title, e.duration, e.publishedAt, e.showId,
        s.title AS showTitle, s.artworkUri AS showArtworkUri
      FROM episodes e
      INNER JOIN shows s ON s.id = e.showId
      LEFT JOIN playbackProgress pp ON pp.itemId = e.id AND pp.itemType = 'episode'
      WHERE pp.itemId IS NULL OR (pp.isCompleted = 0 AND pp.positionMs = 0)
      ORDER BY e.publishedAt DESC
      LIMIT ${limit}
    `;
  };

  public toggleFavourite = async (id: string): Promise<boolean> => {
    const db = await this.#db();
    const show = await this.findById(id);
    if (!show) return false;
    const newValue = !show.isFavourite;
    await db.sql`UPDATE shows SET isFavourite = ${newValue ? 1 : 0} WHERE id = ${id}`;
    await db.save();
    this.emit('changed');
    return newValue;
  };
}

export type { LatestEpisode };
export { ShowsService };
