import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

import * as schema from "./db.schema";

const expo = openDatabaseSync("fermata.db");
expo.execSync("PRAGMA foreign_keys = ON;");

export const db = drizzle(expo, { schema });

export type Database = typeof db;
