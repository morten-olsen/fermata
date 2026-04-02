import { openDatabaseAsync } from "expo-sqlite";


const createDB = async () => {
  const db = await openDatabaseAsync("library.db");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  return {
    save: async () => { },
    sql: db.sql,
  }
}

type DatabaseInstance = Awaited<ReturnType<typeof createDB>>;

export type { DatabaseInstance };
export { createDB };

