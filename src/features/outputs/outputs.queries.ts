import { eq } from "drizzle-orm";

import { db } from "@/src/shared/db/db.client";
import { outputConfigs } from "@/src/shared/db/db.schema";

export async function getAllOutputConfigs() {
  return db.select().from(outputConfigs);
}

export function getOutputConfig(id: string) {
  return db.select().from(outputConfigs).where(eq(outputConfigs.id, id)).get();
}

export async function upsertOutputConfig(
  config: typeof outputConfigs.$inferInsert,
) {
  return db
    .insert(outputConfigs)
    .values(config)
    .onConflictDoUpdate({
      target: outputConfigs.id,
      set: {
        name: config.name,
        config: config.config,
      },
    });
}

export async function deleteOutputConfig(id: string) {
  return db.delete(outputConfigs).where(eq(outputConfigs.id, id));
}
