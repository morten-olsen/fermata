import type { Migration } from "./migrations.types";

const favourites: Migration = {
  name: '005-favourites',
  up: async (db) => {
    await db.sql`ALTER TABLE shows ADD COLUMN isFavourite INTEGER NOT NULL DEFAULT 0`;
    await db.sql`ALTER TABLE audiobooks ADD COLUMN isFavourite INTEGER NOT NULL DEFAULT 0`;
  },
};

export { favourites };
