import type { DatabaseInstance } from "./database.create";
import { createDB } from "./database.create";
import { applyMigrations } from "./migrations/migrations";

class DatabaseService {
  #instance?: Promise<DatabaseInstance>;

  #setup = async () => {
    const db = await createDB();
    await applyMigrations(db);
    return db;
  }

  public getInstance = async () => {
    if (!this.#instance) {
      this.#instance = this.#setup();
    }
    return this.#instance;
  }
}

export { DatabaseService };
