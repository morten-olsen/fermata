import type { Migration } from "./migrations.types";

const outputs: Migration = {
  name: '003-outputs',
  up: async (db) => {
    await db.sql`
      CREATE TABLE outputConfigs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        config TEXT NOT NULL DEFAULT '{}',
        createdAt TEXT NOT NULL
      )
    `;
  },
};

export { outputs };
