import type { DatabaseInstance } from "../database.create";

import { init } from "./migrations.001-init";

const migrations = [init];

const applyMigrations = async (db: DatabaseInstance) => {
  await db.sql`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `;

  const applied = await db.sql<{ name: string }>`SELECT name FROM migrations`;
  const appliedNames = new Set((applied as { name: string }[]).map((row) => row.name));

  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) continue;
    await migration.up(db);
    await db.sql`INSERT INTO migrations (name, applied_at) VALUES (${migration.name}, ${new Date().toISOString()})`;
  }
};

export { applyMigrations };
