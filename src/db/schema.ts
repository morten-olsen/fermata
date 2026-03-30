import { relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ── Sources ────────────────────────────────────────────

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // 'jellyfin' | 'plex' | 'local' | etc.
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  userId: text("user_id"), // remote user ID (e.g. Jellyfin userId)
  accessToken: text("access_token"), // TODO: migrate to expo-secure-store
  lastSyncedAt: text("last_synced_at"),
});

// ── Artists ────────────────────────────────────────────

export const artists = sqliteTable(
  "artists",
  {
    id: text("id").primaryKey(), // deterministic: hash(sourceId, sourceItemId)
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    sourceItemId: text("source_item_id").notNull(),
    name: text("name").notNull(),
    artworkSourceItemId: text("artwork_source_item_id"),
    syncedAt: text("synced_at").notNull(),
  },
  (table) => [
    uniqueIndex("artists_source_unique").on(table.sourceId, table.sourceItemId),
    index("artists_name_idx").on(table.name),
  ]
);

// ── Albums ─────────────────────────────────────────────

export const albums = sqliteTable(
  "albums",
  {
    id: text("id").primaryKey(), // deterministic: hash(sourceId, sourceItemId)
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    sourceItemId: text("source_item_id").notNull(),
    title: text("title").notNull(),
    artistName: text("artist_name").notNull(),
    year: integer("year"),
    artworkSourceItemId: text("artwork_source_item_id"),
    trackCount: integer("track_count"),
    syncedAt: text("synced_at").notNull(),
  },
  (table) => [
    uniqueIndex("albums_source_unique").on(table.sourceId, table.sourceItemId),
    index("albums_artist_idx").on(table.artistName),
    index("albums_title_idx").on(table.title),
  ]
);

// ── Tracks ─────────────────────────────────────────────

export const tracks = sqliteTable(
  "tracks",
  {
    id: text("id").primaryKey(), // deterministic: hash(sourceId, sourceItemId)
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    sourceItemId: text("source_item_id").notNull(),
    title: text("title").notNull(),
    artistName: text("artist_name").notNull(),
    albumTitle: text("album_title").notNull(),
    albumId: text("album_id"),
    duration: real("duration").notNull(), // seconds
    trackNumber: integer("track_number"),
    discNumber: integer("disc_number"),
    isFavourite: integer("is_favourite").default(0),
    syncedAt: text("synced_at").notNull(),
  },
  (table) => [
    uniqueIndex("tracks_source_unique").on(table.sourceId, table.sourceItemId),
    index("tracks_album_idx").on(table.albumId),
    index("tracks_artist_idx").on(table.artistName),
    index("tracks_title_idx").on(table.title),
  ]
);

// ── Playlists ─────────────────────────────────────────

export const playlists = sqliteTable(
  "playlists",
  {
    id: text("id").primaryKey(), // stableId() for synced, generateId() for local-only
    sourceId: text("source_id")
      .references(() => sources.id, { onDelete: "cascade" }), // null = local-only
    sourceItemId: text("source_item_id"), // null = local-only
    name: text("name").notNull(),
    description: text("description"),
    isMixTape: integer("is_mix_tape").default(0), // 1 = pinned as a "mix tape"
    artworkSourceItemId: text("artwork_source_item_id"),
    trackCount: integer("track_count").default(0),
    needsSync: integer("needs_sync").default(0), // 1 = has local edits pending push to source
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    syncedAt: text("synced_at"), // null for never-synced local playlists
  },
  (table) => [
    uniqueIndex("playlists_source_unique").on(table.sourceId, table.sourceItemId),
    index("playlists_name_idx").on(table.name),
    index("playlists_mix_tape_idx").on(table.isMixTape),
    index("playlists_needs_sync_idx").on(table.needsSync),
  ]
);

export const playlistTracks = sqliteTable(
  "playlist_tracks",
  {
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    addedAt: text("added_at").notNull(),
  },
  (table) => [
    uniqueIndex("playlist_tracks_unique").on(table.playlistId, table.trackId),
    index("playlist_tracks_playlist_idx").on(table.playlistId),
  ]
);

// ── Relations ──────────────────────────────────────────

export const sourcesRelations = relations(sources, ({ many }) => ({
  artists: many(artists),
  albums: many(albums),
  tracks: many(tracks),
  playlists: many(playlists),
}));

export const artistsRelations = relations(artists, ({ one }) => ({
  source: one(sources, {
    fields: [artists.sourceId],
    references: [sources.id],
  }),
}));

export const albumsRelations = relations(albums, ({ one, many }) => ({
  source: one(sources, {
    fields: [albums.sourceId],
    references: [sources.id],
  }),
  tracks: many(tracks),
}));

export const tracksRelations = relations(tracks, ({ one }) => ({
  source: one(sources, {
    fields: [tracks.sourceId],
    references: [sources.id],
  }),
  album: one(albums, {
    fields: [tracks.albumId],
    references: [albums.id],
  }),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  source: one(sources, {
    fields: [playlists.sourceId],
    references: [sources.id],
  }),
  tracks: many(playlistTracks),
}));

export const playlistTracksRelations = relations(playlistTracks, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistTracks.playlistId],
    references: [playlists.id],
  }),
  track: one(tracks, {
    fields: [playlistTracks.trackId],
    references: [tracks.id],
  }),
}));
