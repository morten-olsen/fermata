import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";

const DB_NAME = "library";
const IDB_STORE = "databases";
const DB_KEY = "library";

// ── IndexedDB persistence ────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error("Failed to open IndexedDB"));
  });
}

async function loadFromIDB(): Promise<ArrayBuffer | null> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(DB_KEY);
    req.onsuccess = () => resolve(req.result as ArrayBuffer | null ?? null);
    req.onerror = () => reject(new Error("Failed to load from IndexedDB"));
  });
}

async function saveToIDB(data: ArrayBuffer): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(data, DB_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error("Failed to save to IndexedDB"));
  });
}

// ── Tagged query (matches expo-sqlite SQLiteTaggedQuery interface) ──

type SQLiteRunResult = {
  lastInsertRowId: number;
  changes: number;
};

function buildQuery(strings: TemplateStringsArray, values: unknown[]): { sql: string; params: unknown[] } {
  let sql = '';
  const params: unknown[] = [];
  for (let i = 0; i < strings.length; i++) {
    sql += strings[i];
    if (i < values.length) {
      sql += '?';
      params.push(values[i]);
    }
  }
  return { sql, params };
}

function isMutating(sql: string): boolean {
  const trimmed = sql.trimStart().toUpperCase();
  return (
    trimmed.startsWith('INSERT') ||
    trimmed.startsWith('UPDATE') ||
    trimmed.startsWith('DELETE') ||
    trimmed.startsWith('CREATE') ||
    trimmed.startsWith('DROP') ||
    trimmed.startsWith('ALTER') ||
    trimmed.startsWith('PRAGMA')
  );
}

function execAsObjects<T>(db: SqlJsDatabase, sql: string, params: unknown[]): T[] {
  const results = db.exec(sql, params as initSqlJs.BindParams);
  if (results.length === 0) return [];
  const { columns, values } = results[0];
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i]] = row[i];
    }
    return obj as T;
  });
}

function execAsValues(db: SqlJsDatabase, sql: string, params: unknown[]): unknown[][] {
  const results = db.exec(sql, params as initSqlJs.BindParams);
  if (results.length === 0) return [];
  return results[0].values as unknown[][];
}

function execRun(db: SqlJsDatabase, sql: string, params: unknown[]): SQLiteRunResult {
  db.run(sql, params as initSqlJs.BindParams);
  const changes = db.getRowsModified();
  const lastIdResult = db.exec("SELECT last_insert_rowid()");
  const lastInsertRowId = lastIdResult.length > 0
    ? (lastIdResult[0].values[0][0] as number)
    : 0;
  return { lastInsertRowId, changes };
}

class WebTaggedQuery<T = unknown> implements PromiseLike<T[] | SQLiteRunResult> {
  private readonly db: SqlJsDatabase;
  private readonly sql: string;
  private readonly params: unknown[];
  private readonly mutating: boolean;

  constructor(db: SqlJsDatabase, strings: TemplateStringsArray, values: unknown[]) {
    const q = buildQuery(strings, values);
    this.db = db;
    this.sql = q.sql;
    this.params = q.params;
    this.mutating = isMutating(q.sql);
  }

  then<TResult1 = T[] | SQLiteRunResult, TResult2 = never>(
    onfulfilled?: ((value: T[] | SQLiteRunResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    try {
      const result = this.allSync();
      return Promise.resolve(result).then(onfulfilled, onrejected);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return Promise.reject(err).then(onfulfilled, onrejected);
    }
  }

  values(): Promise<unknown[][]> {
    return Promise.resolve(this.valuesSync());
  }

  first(): Promise<T | null> {
    return Promise.resolve(this.firstSync());
  }

  *each(): IterableIterator<T> {
    yield* this.eachSync();
  }

  allSync(): T[] | SQLiteRunResult {
    if (this.mutating) {
      return execRun(this.db, this.sql, this.params);
    }
    return execAsObjects<T>(this.db, this.sql, this.params);
  }

  valuesSync(): unknown[][] {
    return execAsValues(this.db, this.sql, this.params);
  }

  firstSync(): T | null {
    const rows = execAsObjects<T>(this.db, this.sql, this.params);
    return rows[0] ?? null;
  }

  *eachSync(): IterableIterator<T> {
    const rows = execAsObjects<T>(this.db, this.sql, this.params);
    for (const row of rows) {
      yield row;
    }
  }
}

// ── Database creation ────────────────────────────────────

const createDB = async () => {
  const SQL = await initSqlJs({
    locateFile: (file: string) => `${process.env.EXPO_PUBLIC_BASE_PATH ?? ""}/${file}`,
  });

  const saved = await loadFromIDB();
  const sqlDb = saved ? new SQL.Database(new Uint8Array(saved)) : new SQL.Database();

  sqlDb.run("PRAGMA foreign_keys = ON;");

  const save = async () => {
    const data = sqlDb.export();
    await saveToIDB(data.buffer as ArrayBuffer);
  };

  const sql = <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]) =>
    new WebTaggedQuery<T>(sqlDb, strings, values);

  return {
    save,
    sql,
  };
};

type DatabaseInstance = Awaited<ReturnType<typeof createDB>>;

export type { DatabaseInstance };
export { createDB };
