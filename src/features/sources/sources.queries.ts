import { eq } from "drizzle-orm";

import { db } from "@/src/shared/db/db.client";
import { sources } from "@/src/shared/db/db.schema";

export async function getAllSources() {
  return db.select().from(sources);
}

export async function getSource(id: string) {
  return db.select().from(sources).where(eq(sources.id, id)).get();
}

export async function upsertSource(source: typeof sources.$inferInsert) {
  return db
    .insert(sources)
    .values(source)
    .onConflictDoUpdate({
      target: sources.id,
      set: {
        name: source.name,
        baseUrl: source.baseUrl,
        userId: source.userId,
        accessToken: source.accessToken,
        lastSyncedAt: source.lastSyncedAt,
      },
    });
}

export async function deleteSource(id: string) {
  return db.delete(sources).where(eq(sources.id, id));
}
