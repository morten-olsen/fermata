import type { Migration } from "./migrations.types";

const artworkUri: Migration = {
  name: '004-artwork-uri',
  up: async (db) => {
    await db.sql`ALTER TABLE artists ADD COLUMN artworkUri TEXT`;
    await db.sql`ALTER TABLE albums ADD COLUMN artworkUri TEXT`;
    await db.sql`ALTER TABLE tracks ADD COLUMN artworkUri TEXT`;
    await db.sql`ALTER TABLE shows ADD COLUMN artworkUri TEXT`;
    await db.sql`ALTER TABLE episodes ADD COLUMN artworkUri TEXT`;
    await db.sql`ALTER TABLE audiobooks ADD COLUMN artworkUri TEXT`;
  },
};

export { artworkUri };
