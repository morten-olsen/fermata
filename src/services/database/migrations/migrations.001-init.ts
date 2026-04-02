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
        last_synced_at TEXT
      )
    `;

    // ── Artists
    await db.sql`
      CREATE TABLE artists (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        source_item_id TEXT NOT NULL,
        name TEXT NOT NULL,
        artwork_source_item_id TEXT,
        is_favourite INTEGER DEFAULT 0,
        synced_at TEXT NOT NULL
      )
    `;
    await db.sql`CREATE UNIQUE INDEX artists_source_unique ON artists(source_id, source_item_id)`;
    await db.sql`CREATE INDEX artists_name_idx ON artists(name)`;

    // ── Albums (music)
    await db.sql`
      CREATE TABLE albums (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        source_item_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist_name TEXT NOT NULL,
        year INTEGER,
        artwork_source_item_id TEXT,
        track_count INTEGER,
        is_favourite INTEGER DEFAULT 0,
        synced_at TEXT NOT NULL
      )
    `;
    await db.sql`CREATE UNIQUE INDEX albums_source_unique ON albums(source_id, source_item_id)`;
    await db.sql`CREATE INDEX albums_artist_name_idx ON albums(artist_name)`;
    await db.sql`CREATE INDEX albums_title_idx ON albums(title)`;

    // ── Tracks (music)
    await db.sql`
      CREATE TABLE tracks (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        source_item_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist_name TEXT NOT NULL,
        album_title TEXT NOT NULL,
        album_id TEXT REFERENCES albums(id) ON DELETE SET NULL,
        duration REAL NOT NULL,
        track_number INTEGER,
        disc_number INTEGER,
        is_favourite INTEGER DEFAULT 0,
        artwork_source_item_id TEXT,
        synced_at TEXT NOT NULL
      )
    `;
    await db.sql`CREATE UNIQUE INDEX tracks_source_unique ON tracks(source_id, source_item_id)`;
    await db.sql`CREATE INDEX tracks_album_id_idx ON tracks(album_id)`;
    await db.sql`CREATE INDEX tracks_artist_name_idx ON tracks(artist_name)`;
    await db.sql`CREATE INDEX tracks_title_idx ON tracks(title)`;

    // ── Playlists / Mix Tapes
    await db.sql`
      CREATE TABLE playlists (
        id TEXT PRIMARY KEY,
        source_id TEXT REFERENCES sources(id) ON DELETE CASCADE,
        source_item_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        artwork_source_item_id TEXT,
        track_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT
      )
    `;
    await db.sql`CREATE UNIQUE INDEX playlists_source_unique ON playlists(source_id, source_item_id)`;
    await db.sql`CREATE INDEX playlists_name_idx ON playlists(name)`;

    // ── Playlist Tracks (join table)
    await db.sql`
      CREATE TABLE playlist_tracks (
        playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        added_at TEXT NOT NULL,
        PRIMARY KEY (playlist_id, track_id)
      )
    `;
    await db.sql`CREATE INDEX playlist_tracks_playlist_idx ON playlist_tracks(playlist_id)`;

    // ── Audiobooks
    await db.sql`
      CREATE TABLE audiobooks (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        source_item_id TEXT NOT NULL,
        title TEXT NOT NULL,
        author_name TEXT NOT NULL,
        narrator_name TEXT,
        description TEXT,
        duration REAL NOT NULL,
        artwork_source_item_id TEXT,
        chapters TEXT,
        synced_at TEXT NOT NULL
      )
    `;
    await db.sql`CREATE UNIQUE INDEX audiobooks_source_unique ON audiobooks(source_id, source_item_id)`;
    await db.sql`CREATE INDEX audiobooks_title_idx ON audiobooks(title)`;
    await db.sql`CREATE INDEX audiobooks_author_name_idx ON audiobooks(author_name)`;

    // ── Shows (podcasts)
    await db.sql`
      CREATE TABLE shows (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        source_item_id TEXT NOT NULL,
        title TEXT NOT NULL,
        author_name TEXT,
        description TEXT,
        artwork_source_item_id TEXT,
        episode_count INTEGER,
        synced_at TEXT NOT NULL
      )
    `;
    await db.sql`CREATE UNIQUE INDEX shows_source_unique ON shows(source_id, source_item_id)`;
    await db.sql`CREATE INDEX shows_title_idx ON shows(title)`;

    // ── Episodes (podcasts)
    await db.sql`
      CREATE TABLE episodes (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        source_item_id TEXT NOT NULL,
        show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        duration REAL NOT NULL,
        published_at TEXT,
        episode_number INTEGER,
        season_number INTEGER,
        content_url TEXT,
        artwork_source_item_id TEXT,
        synced_at TEXT NOT NULL
      )
    `;
    await db.sql`CREATE UNIQUE INDEX episodes_source_unique ON episodes(source_id, source_item_id)`;
    await db.sql`CREATE INDEX episodes_show_id_idx ON episodes(show_id)`;
    await db.sql`CREATE INDEX episodes_published_at_idx ON episodes(published_at)`;

    // ── Queue
    await db.sql`
      CREATE TABLE queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
        audiobook_id TEXT REFERENCES audiobooks(id) ON DELETE CASCADE,
        episode_id TEXT REFERENCES episodes(id) ON DELETE CASCADE,
        start_at_ms INTEGER,
        position INTEGER NOT NULL
      )
    `;
    await db.sql`CREATE INDEX queue_position_idx ON queue(position)`;

    // ── Playback Progress
    await db.sql`
      CREATE TABLE playback_progress (
        item_id TEXT NOT NULL,
        item_type TEXT NOT NULL,
        position_ms INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        is_completed INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        needs_sync INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (item_id, item_type)
      )
    `;
    await db.sql`CREATE INDEX playback_progress_needs_sync_idx ON playback_progress(needs_sync)`;
  },
};

export { init };
