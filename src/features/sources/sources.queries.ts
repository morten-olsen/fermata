import { eq } from "drizzle-orm";

import { db } from "@/src/shared/db/db.client";
import { sources, artists, albums, tracks } from "@/src/shared/db/db.schema";

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
  // Explicitly delete dependent rows — SQLite cascade deletes only
  // work when PRAGMA foreign_keys is ON, which may not have been
  // the case for databases created before the pragma was added.
  await db.delete(tracks).where(eq(tracks.sourceId, id));
  await db.delete(albums).where(eq(albums.sourceId, id));
  await db.delete(artists).where(eq(artists.sourceId, id));
  await db.delete(sources).where(eq(sources.id, id));
}

/** Remove orphaned entities whose source no longer exists */
export async function cleanupOrphanedEntities() {
  const existingSourceIds = (await db.select({ id: sources.id }).from(sources)).map((r) => r.id);
  if (existingSourceIds.length === 0) {
    // No sources — delete everything
    await db.delete(tracks);
    await db.delete(albums);
    await db.delete(artists);
    return;
  }
  // Delete entities whose sourceId isn't in the current sources list
  for (const table of [tracks, albums, artists] as const) {
    const rows = await db.select({ id: table.id, sourceId: table.sourceId }).from(table);
    const orphanIds = rows
      .filter((r) => !existingSourceIds.includes(r.sourceId))
      .map((r) => r.id);
    for (const orphanId of orphanIds) {
      await db.delete(table).where(eq(table.id, orphanId));
    }
  }
}
