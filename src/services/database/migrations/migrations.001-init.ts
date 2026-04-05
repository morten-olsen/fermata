import type { Migration } from "./migrations.types";

const init: Migration = {
  name: '001-init',
  up: async (db) => {
    // ── Sources
    await db.sql`
      CREATE TABLE sources (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT,
        config TEXT NOT NULL DEFAULT '{}',
        lastSyncedAt TEXT
      )
    `;

    // ── Artists
    await db.sql`
      CREATE TABLE artists (
        id TEXT PRIMARY KEY,
        sourceId TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        sourceItemId TEXT NOT NULL,
        name TEXT NOT NULL,
        artworkSourceItemId TEXT,
        isFavourite INTEGER DEFAULT 0,
        syncedAt TEXT NOT NULL
      )
    `;
    await db.sql`CREATE UNIQUE INDEX artists_source_unique ON artists(sourceId, sourceItemId)`;
    await db.sql`CREATE INDEX artists_name_idx ON artists(name)`;

    // ── Albums (music)
    await db.sql`
      CREATE TABLE albums (
        id TEXT PRIMARY KEY,
        sourceId TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        sourceItemId TEXT NOT NULL,
        title TEXT NOT NULL,
        artistName TEXT NOT NULL,
        year INTEGER,
        artworkSourceItemId TEXT,
        trackCount INTEGER,
        isFavourite INTEGER DEFAULT 0,
        syncedAt TEXT NOT NULL
      )
    `;
    await db.sql`CREATE UNIQUE INDEX albums_source_unique ON albums(sourceId, sourceItemId)`;
    await db.sql`CREATE INDEX albums_artistName_idx ON albums(artistName)`;
    await db.sql`CREATE INDEX albums_title_idx ON albums(title)`;

    // ── Tracks (music)
    await db.sql`
      CREATE TABLE tracks (
        id TEXT PRIMARY KEY,
        sourceId TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        sourceItemId TEXT NOT NULL,
        title TEXT NOT NULL,
        artistName TEXT NOT NULL,
        albumTitle TEXT NOT NULL,
        albumId TEXT REFERENCES albums(id) ON DELETE SET NULL,
        duration REAL NOT NULL,
        trackNumber INTEGER,
        discNumber INTEGER,
        isFavourite INTEGER DEFAULT 0,
        artworkSourceItemId TEXT,
        syncedAt TEXT NOT NULL
      )
    `;
    await db.sql`CREATE UNIQUE INDEX tracks_source_unique ON tracks(sourceId, sourceItemId)`;
    await db.sql`CREATE INDEX tracks_albumId_idx ON tracks(albumId)`;
    await db.sql`CREATE INDEX tracks_artistName_idx ON tracks(artistName)`;
    await db.sql`CREATE INDEX tracks_title_idx ON tracks(title)`;

    // ── Playlists / Mix Tapes
    await db.sql`
      CREATE TABLE playlists (
        id TEXT PRIMARY KEY,
        sourceId TEXT REFERENCES sources(id) ON DELETE CASCADE,
        sourceItemId TEXT,
        name TEXT NOT NULL,
        description TEXT,
        artworkSourceItemId TEXT,
        trackCount INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncedAt TEXT
      )
    `;
    await db.sql`CREATE UNIQUE INDEX playlists_source_unique ON playlists(sourceId, sourceItemId)`;
    await db.sql`CREATE INDEX playlists_name_idx ON playlists(name)`;

    // ── Playlist Tracks (join table)
    await db.sql`
      CREATE TABLE playlistTracks (
        playlistId TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        trackId TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        addedAt TEXT NOT NULL,
        PRIMARY KEY (playlistId, trackId)
      )
    `;
    await db.sql`CREATE INDEX playlistTracks_playlistId_idx ON playlistTracks(playlistId)`;

    // ── Audiobooks
    await db.sql`
      CREATE TABLE audiobooks (
        id TEXT PRIMARY KEY,
        sourceId TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        sourceItemId TEXT NOT NULL,
        title TEXT NOT NULL,
        authorName TEXT NOT NULL,
        narratorName TEXT,
        description TEXT,
        duration REAL NOT NULL,
        artworkSourceItemId TEXT,
        chapters TEXT,
        syncedAt TEXT NOT NULL
      )
    `;
    await db.sql`CREATE UNIQUE INDEX audiobooks_source_unique ON audiobooks(sourceId, sourceItemId)`;
    await db.sql`CREATE INDEX audiobooks_title_idx ON audiobooks(title)`;
    await db.sql`CREATE INDEX audiobooks_authorName_idx ON audiobooks(authorName)`;

    // ── Shows (podcasts)
    await db.sql`
      CREATE TABLE shows (
        id TEXT PRIMARY KEY,
        sourceId TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        sourceItemId TEXT NOT NULL,
        title TEXT NOT NULL,
        authorName TEXT,
        description TEXT,
        artworkSourceItemId TEXT,
        episodeCount INTEGER,
        syncedAt TEXT NOT NULL
      )
    `;
    await db.sql`CREATE UNIQUE INDEX shows_source_unique ON shows(sourceId, sourceItemId)`;
    await db.sql`CREATE INDEX shows_title_idx ON shows(title)`;

    // ── Episodes (podcasts)
    await db.sql`
      CREATE TABLE episodes (
        id TEXT PRIMARY KEY,
        sourceId TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        sourceItemId TEXT NOT NULL,
        showId TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        duration REAL NOT NULL,
        publishedAt TEXT,
        episodeNumber INTEGER,
        seasonNumber INTEGER,
        contentUrl TEXT,
        artworkSourceItemId TEXT,
        syncedAt TEXT NOT NULL
      )
    `;
    await db.sql`CREATE UNIQUE INDEX episodes_source_unique ON episodes(sourceId, sourceItemId)`;
    await db.sql`CREATE INDEX episodes_showId_idx ON episodes(showId)`;
    await db.sql`CREATE INDEX episodes_publishedAt_idx ON episodes(publishedAt)`;

    // ── Queue
    await db.sql`
      CREATE TABLE queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        trackId TEXT REFERENCES tracks(id) ON DELETE CASCADE,
        audiobookId TEXT REFERENCES audiobooks(id) ON DELETE CASCADE,
        episodeId TEXT REFERENCES episodes(id) ON DELETE CASCADE,
        startAtMs INTEGER,
        position INTEGER NOT NULL
      )
    `;
    await db.sql`CREATE INDEX queue_position_idx ON queue(position)`;

    // ── Playback Progress
    await db.sql`
      CREATE TABLE playbackProgress (
        itemId TEXT NOT NULL,
        itemType TEXT NOT NULL,
        positionMs INTEGER NOT NULL DEFAULT 0,
        durationMs INTEGER NOT NULL DEFAULT 0,
        isCompleted INTEGER NOT NULL DEFAULT 0,
        updatedAt TEXT NOT NULL,
        needsSync INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (itemId, itemType)
      )
    `;
    await db.sql`CREATE INDEX playbackProgress_needsSync_idx ON playbackProgress(needsSync)`;
  },
};

export { init };
