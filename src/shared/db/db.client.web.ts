import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";

import * as schema from "./db.schema";

const DB_NAME = "fermata";
const IDB_STORE = "databases";

// ── IndexedDB persistence ────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIDB(): Promise<ArrayBuffer | null> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.get("fermata.db");
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIDB(data: ArrayBuffer): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(data, "fermata.db");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── sql.js init ──────────────────────────────────────────

let sqlDb: SqlJsDatabase | null = null;

async function getSqlJsDatabase(): Promise<SqlJsDatabase> {
  if (sqlDb) return sqlDb;

  const SQL = await initSqlJs({
    locateFile: (file: string) => `${process.env.EXPO_PUBLIC_BASE_PATH ?? ""}/${file}`,
  });

  const saved = await loadFromIDB();
  sqlDb = saved ? new SQL.Database(new Uint8Array(saved)) : new SQL.Database();

  return sqlDb;
}

/** Persist the current database state to IndexedDB. */
export async function persistDatabase(): Promise<void> {
  if (!sqlDb) return;
  const data = sqlDb.export();
  await saveToIDB(data.buffer as ArrayBuffer);
}

// ── Auto-persistence ─────────────────────────────────────

let persistTimer: ReturnType<typeof setInterval> | null = null;

function startAutoPersist() {
  if (persistTimer) return;
  // Persist every 2 seconds if the db exists
  persistTimer = setInterval(() => {
    persistDatabase().catch(() => {});
  }, 2000);

  // Also persist on tab close / navigation
  window.addEventListener("beforeunload", () => {
    if (sqlDb) {
      const data = sqlDb.export();
      // Sync write via localStorage as last resort (IDB is async)
      try {
        saveToIDB(data.buffer as ArrayBuffer);
      } catch {
        // Best-effort
      }
    }
  });
}

// ── Drizzle client (lazy async init) ─────────────────────

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;

export async function initDatabase(): Promise<DrizzleDb> {
  if (_db) return _db;
  const raw = await getSqlJsDatabase();
  _db = drizzle(raw, { schema });
  startAutoPersist();
  return _db;
}

/**
 * Synchronous accessor — only safe after initDatabase() resolves.
 * All query files import this; it's populated before the app renders.
 */
export let db: DrizzleDb = null as unknown as DrizzleDb;

export function setDb(instance: DrizzleDb) {
  db = instance;
}

export type Database = DrizzleDb;
