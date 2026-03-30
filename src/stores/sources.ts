import { create } from "zustand";
import type { SourceAdapter } from "../adapters/sources/types";
import { createAdapter } from "../adapters/sources/registry";
import { db } from "../db/client";
import { sources } from "../db/schema";
import { upsertSource, deleteSource as dbDeleteSource, generateId } from "../db/queries";
import { eq } from "drizzle-orm";

interface SourceEntry {
  id: string;
  type: string;
  name: string;
  baseUrl: string;
  adapter: SourceAdapter;
}

interface SourcesState {
  sources: SourceEntry[];
  isLoading: boolean;

  /** Load saved sources from DB and restore adapter connections */
  loadSources: () => Promise<void>;

  /** Add and connect a new source */
  addSource: (
    type: string,
    name: string,
    baseUrl: string,
    credentials: Record<string, string>
  ) => Promise<void>;

  /** Remove a source and all its synced data (cascade delete) */
  removeSource: (id: string) => Promise<void>;

  /** Get an adapter by source ID */
  getAdapter: (id: string) => SourceAdapter | undefined;

  /** Get all adapters (for sync) */
  getAllAdapters: () => SourceAdapter[];
}

export const useSourcesStore = create<SourcesState>((set, get) => ({
  sources: [],
  isLoading: false,

  loadSources: async () => {
    set({ isLoading: true });
    try {
      const rows = await db.select().from(sources);
      const entries: SourceEntry[] = [];

      for (const row of rows) {
        if (!row.accessToken || !row.userId) continue;

        try {
          const adapter = createAdapter(row.type, row.id, row.name);
          adapter.restore({
            baseUrl: row.baseUrl,
            userId: row.userId,
            accessToken: row.accessToken,
          });
          entries.push({
            id: row.id,
            type: row.type,
            name: row.name,
            baseUrl: row.baseUrl,
            adapter,
          });
        } catch {
          // Unknown adapter type — skip (logged in future)
        }
      }

      set({ sources: entries });
    } finally {
      set({ isLoading: false });
    }
  },

  addSource: async (type, name, baseUrl, credentials) => {
    const id = generateId();
    const adapter = createAdapter(type, id, name);

    await adapter.connect({ baseUrl, credentials });

    const persisted = adapter.getPersistedState();
    await upsertSource({
      id,
      type,
      name,
      baseUrl: persisted.baseUrl,
      userId: persisted.userId,
      accessToken: persisted.accessToken,
      lastSyncedAt: null,
    });

    set((state) => ({
      sources: [
        ...state.sources,
        { id, type, name, baseUrl: persisted.baseUrl, adapter },
      ],
    }));
  },

  removeSource: async (id) => {
    const entry = get().sources.find((s) => s.id === id);
    if (entry) {
      await entry.adapter.disconnect();
    }
    await dbDeleteSource(id);
    set((state) => ({
      sources: state.sources.filter((s) => s.id !== id),
    }));
  },

  getAdapter: (id) => {
    return get().sources.find((s) => s.id === id)?.adapter;
  },

  getAllAdapters: () => {
    return get().sources.map((s) => s.adapter);
  },
}));
