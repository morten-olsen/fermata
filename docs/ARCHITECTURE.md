# Fermata — Architecture

## Overview

Fermata follows a three-layer architecture: **Sources** bring music in, the **Library** unifies and stores it, and **Outputs** play it.

```
Sources ──sync──▶ Library (Drizzle + SQLite) ──stream──▶ Outputs
```

Playback streams audio directly from the source — the library layer only stores metadata.

## Source Adapters

Each source implements a common interface for syncing metadata and streaming audio. New adapters are registered in the **adapter registry** (`src/adapters/sources/registry.ts`) — stores and the sync engine never import concrete adapter classes directly.

```typescript
interface SourceAdapter {
  id: string;
  type: string;
  name: string;

  // Connection lifecycle
  connect(config: SourceConfig): Promise<void>;
  restore(state: SourcePersistedState): void;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
  getPersistedState(): SourcePersistedState;

  // Library sync
  getArtists(since?: Date): Promise<Artist[]>;
  getAlbums(since?: Date): Promise<Album[]>;
  getTracks(since?: Date): Promise<Track[]>;

  // Streaming & artwork (synchronous — URLs are constructable from local state)
  getStreamUrl(trackId: string): string;
  getArtworkUrl(itemId: string, size?: ImageSize): string;
}
```

### Adapter Registry

```typescript
import { createAdapter } from "./registry";
const adapter = createAdapter("jellyfin", id, name);
```

To add a new source type: implement `SourceAdapter`, then call `registerAdapter("type", MyAdapter)` in `registry.ts`.

### Jellyfin Adapter

The first adapter. Supports multiple simultaneous instances — a user can connect to several Jellyfin servers. Each server is a separate adapter instance with its own credentials and base URL.

- **`api.ts`** — raw HTTP client: authentication (`/Users/AuthenticateByName`), paginated library fetching (`/Items`), stream URLs (`/Audio/{id}/universal`), artwork URLs (`/Items/{id}/Images/Primary`)
- **`adapter.ts`** — implements `SourceAdapter`, maps Jellyfin items to domain types

**Key details:**
- Authentication via username/password → access token
- Incremental sync using `minDateLastSaved` parameter
- `restore()` rehydrates from persisted `baseUrl`, `userId`, `accessToken` without re-authenticating
- Stream URLs include the access token as a query parameter

## Library Layer

A local SQLite database managed via **Drizzle ORM** that stores the unified catalog from all connected sources.

### Schema (Drizzle — `src/db/schema.ts`)

Every item tracks its **source origin** so it can be traced back and streamed:

```
sources
  ├── id
  ├── type, name, base_url
  ├── user_id, access_token       (TODO: migrate to expo-secure-store)
  └── last_synced_at

artists
  ├── id                          (deterministic: stableId(sourceId, sourceItemId))
  ├── source_id, source_item_id   (unique together)
  ├── name
  ├── artwork_source_item_id      (resolve to URL at read time via adapter)
  └── synced_at

albums
  ├── id                          (deterministic)
  ├── source_id, source_item_id   (unique together)
  ├── title, artist_name, year
  ├── artwork_source_item_id      (resolve to URL at read time via adapter)
  ├── track_count
  └── synced_at

tracks
  ├── id                          (deterministic)
  ├── source_id, source_item_id   (unique together)
  ├── title, artist_name, album_title, album_id
  ├── duration, track_number, disc_number
  └── synced_at

mix_tapes
  ├── id                          (random: generateId())
  ├── name
  ├── created_at, updated_at

mix_tape_tracks
  ├── mix_tape_id, track_id       (unique together)
  ├── position
  └── added_at
```

### ID Strategy

- **Synced entities** (artists, albums, tracks): `stableId(sourceId, sourceItemId)` — deterministic hash, survives re-syncs, preserves foreign key references
- **Local entities** (mix tapes): `generateId()` — random time-based

### Artwork

DB stores `artwork_source_item_id`, **not** resolved URLs. Full artwork URLs are constructed at read time via `adapter.getArtworkUrl(itemId, size)` or the helper `resolveArtworkUrl()`. This keeps DB rows independent of server URLs or auth tokens.

### Mix Tapes

Fermata's take on playlists — locally stored, user-curated track lists. Can contain tracks from any source. Unique constraint on `(mix_tape_id, track_id)` prevents duplicates. Positions are renumbered on removal to prevent gaps.

### Unified View

The UI queries SQLite via Drizzle, never remote APIs directly. This provides:
- **Fast browsing** — no network latency for catalog navigation
- **Offline catalog** — browse your library without connectivity
- **Merged results** — albums/artists from multiple sources appear together

**Deduplication** is deferred. Same album on two servers will appear twice for now.

## Output Adapters

Each output implements a common interface for playback control.

```typescript
interface OutputAdapter {
  id: string;
  type: string;
  name: string;

  initialize(): Promise<void>;
  dispose(): Promise<void>;

  play(streamUrl: string, trackId: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(positionMs: number): Promise<void>;

  getState(): PlaybackState;
  onStateChange(callback: (state: PlaybackState) => void): Unsubscribe;
}
```

### Local Output (current)

Wraps React Native Track Player. The **playback store** (`src/stores/playback.ts`) manages the queue and transport, calling Track Player APIs. Track Player is lazy-loaded to allow the app to run in Expo Go without audio.

### Music Assistant Output (future)

Routes playback commands to a Music Assistant instance via its API.

## Playback Flow

```
1. User taps track / album / mix tape
2. Playback store loads track(s) from SQLite
3. For each track: resolve stream URL via adapter.getStreamUrl(sourceItemId)
4. Add to React Native Track Player queue
5. Track Player streams audio from the source server
6. Lock screen / notification controls handled via PlaybackService
```

## Sync Flow

```
1. User taps "Sync Library" or adds a new source
2. For each connected source adapter:
   a. Fetch artists (incremental if synced before)  → upsert in transaction
   b. Fetch albums  (incremental)                   → upsert in transaction
   c. Fetch tracks  (incremental)                   → upsert in transaction
   d. Link tracks to albums via deterministic IDs
   e. Update source.last_synced_at
3. Library store refreshes from SQLite
```

Sync runs in the background — the UI remains responsive. Progress is observable via the sync store.

## Project Structure

```
app/                          # Expo Router screens (file-based routing)
├── (tabs)/
│   ├── library/
│   │   ├── index.tsx         # Library home (mix tapes row, albums/artists/tracks tabs)
│   │   ├── album/[id].tsx    # Album detail (artwork, track list, play/shuffle)
│   │   ├── artist/[name].tsx # Artist detail (albums grid)
│   │   └── mixtape/[id].tsx  # Mix tape detail
│   ├── search/index.tsx      # Debounced search with grouped results
│   └── settings/
│       ├── index.tsx         # Sources, sync, stats, output config
│       └── add-source.tsx    # Add Jellyfin server (modal)
└── player.tsx                # Now Playing (modal, full-screen)

src/
├── adapters/
│   ├── sources/
│   │   ├── types.ts          # SourceAdapter + SourcePersistedState interfaces
│   │   ├── registry.ts       # Adapter factory (type → constructor)
│   │   └── jellyfin/         # api.ts (HTTP client) + adapter.ts (interface impl)
│   └── outputs/types.ts      # OutputAdapter interface
├── db/
│   ├── schema.ts             # Drizzle table definitions (source of truth)
│   ├── client.ts             # Drizzle client (expo-sqlite driver)
│   ├── queries.ts            # All DB operations (CRUD, upsert, search, stats)
│   └── sync.ts               # Sync engine (adapter → SQLite)
├── stores/
│   ├── sources.ts            # Connected sources, adapter lifecycle
│   ├── sync.ts               # Sync progress/status
│   ├── library.ts            # Library data for UI
│   └── playback.ts           # Queue, current track, transport controls
├── services/
│   └── playback-service.ts   # RNTP background service (lock screen controls)
├── lib/
│   └── artwork.ts            # Resolve artworkSourceItemId → URL
├── theme/                    # Colors, React Navigation theme
└── components/
    ├── player/MiniPlayer.tsx  # Slim bar above tab bar
    ├── library/               # AlbumCard, ArtistRow, TrackRow, MixTapeCard
    └── common/                # EmptyState, SegmentedControl

drizzle/                      # Generated SQL migrations
patches/                      # patch-package patches (RNTP RN 0.83 fix)
```
