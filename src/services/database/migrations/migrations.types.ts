import type { DatabaseInstance } from "../database.create";

type Migration = {
  name: string;
  up: (db: DatabaseInstance) => Promise<void>;
}

export type { Migration };
