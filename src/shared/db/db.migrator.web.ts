import { useEffect, useReducer } from "react";

import { initDatabase, setDb, persistDatabase } from "./db.client";

import type { Database } from "./db.client";

interface MigrationConfig {
  journal: {
    entries: {
      idx: number;
      when: number;
      tag: string;
      breakpoints: boolean;
    }[];
  };
  migrations: Record<string, string>;
}

interface State {
  success: boolean;
  error?: Error;
}

/**
 * Run Drizzle migrations against the sql.js database.
 * Replicates the logic from drizzle-orm/expo-sqlite/migrator but for sql.js.
 */
async function migrate(db: Database, config: MigrationConfig): Promise<void> {
  const migrationQueries: { sql: string[]; folderMillis: number; hash: string; bps: boolean }[] = [];

  for (const entry of config.journal.entries) {
    const query = config.migrations[`m${entry.idx.toString().padStart(4, "0")}`];
    if (!query) {
      throw new Error(`Missing migration: ${entry.tag}`);
    }
    const statements = query.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    migrationQueries.push({
      sql: statements,
      bps: entry.breakpoints,
      folderMillis: entry.when,
      hash: "",
    });
  }

  // Use Drizzle's internal migrate which handles the __drizzle_migrations table
  db.dialect.migrate(migrationQueries, db.session);

  await persistDatabase();
}

/**
 * Drop-in replacement for drizzle-orm/expo-sqlite/migrator's useMigrations.
 * Initializes the sql.js database, runs migrations, then exposes the db singleton.
 */
export const useMigrations = (
  _db: unknown, // ignored on web — we initialize internally
  migrations: MigrationConfig
): State => {
  const [state, dispatch] = useReducer(
    (prev: State, action: { type: "migrating" } | { type: "migrated" } | { type: "error"; payload: Error }): State => {
      switch (action.type) {
        case "migrating":
          return { success: false, error: undefined };
        case "migrated":
          return { success: true, error: undefined };
        case "error":
          return { success: false, error: action.payload };
        default:
          return prev;
      }
    },
    { success: false, error: undefined }
  );

  useEffect(() => {
    dispatch({ type: "migrating" });

    initDatabase()
      .then((db) => {
        setDb(db);
        return migrate(db, migrations);
      })
      .then(() => dispatch({ type: "migrated" }))
      .catch((error) => dispatch({ type: "error", payload: error as Error }));
  }, []);

  return state;
};
