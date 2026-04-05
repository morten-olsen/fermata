import type { Migration } from "./migrations.types";

const downloads: Migration = {
  name: '002-downloads',
  up: async (db) => {
    // ── Offline Pins
    await db.sql`
      CREATE TABLE offlinePins (
        id TEXT PRIMARY KEY,
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        sourceId TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        createdAt TEXT NOT NULL,
        UNIQUE (entityType, entityId)
      )
    `;

    // ── Downloads
    await db.sql`
      CREATE TABLE downloads (
        itemId TEXT NOT NULL,
        itemType TEXT NOT NULL CHECK (itemType IN ('track', 'episode', 'audiobook')),
        sourceId TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        filePath TEXT,
        fileSize INTEGER,
        retryCount INTEGER NOT NULL DEFAULT 0,
        errorMessage TEXT,
        downloadedAt TEXT,
        syncedAt TEXT,
        PRIMARY KEY (itemId, itemType)
      )
    `;
    await db.sql`CREATE INDEX downloads_status_idx ON downloads(status)`;
    await db.sql`CREATE INDEX downloads_sourceId_idx ON downloads(sourceId)`;
  },
};

export { downloads };
