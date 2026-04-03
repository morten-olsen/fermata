# Fermata — Architecture

## Overview

Fermata follows a three-layer architecture: **Sources** bring media in, the **Library** stores it locally, and **Outputs** play it.

```
Sources ──sync──▶ Library (SQLite) ──stream──▶ Outputs
```

Playback streams audio directly from the source — the library layer only stores metadata.

## Layers

### Services (`src/services/`)

Platform-agnostic business logic. Services own database access, external API calls, and domain operations. They are plain classes that receive a `Services` container for dependency resolution and extend `EventEmitter` to notify consumers of state changes.

```
src/services/
├── services/services.ts           # DI container
├── database/
│   ├── database.create.ts         # Native SQLite (expo-sqlite)
│   ├── database.create.web.ts     # Web SQLite (sql.js + IndexedDB)
│   ├── database.service.ts        # Lazy DB initialization + migrations
│   ├── database.schemas.ts        # Zod schemas for all tables
│   └── migrations/                # Versioned SQL migrations
├── sources/
│   ├── sources.ts                 # SourcesService — CRUD, authentication
│   ├── sources.adapter.ts         # SourceAdapter interface
│   ├── sources.registry.ts        # Adapter factory + auth dispatch
│   ├── jellyfin/                  # Jellyfin API client + adapter
│   └── audiobookshelf/            # Audiobookshelf API client + adapter
└── sync/
    └── sync.ts                    # SyncService — pull data from sources → DB
```

### Hooks (`src/hooks/`)

React bindings for services. Hooks subscribe to service events and expose reactive state. No SQL or business logic lives here.

```
src/hooks/
├── service/
│   ├── service.ts                 # useService() — resolve from DI container
│   ├── service.query.ts           # useServiceQuery() — reactive data fetching
│   └── service.mutation.ts        # useServiceMutation() — async actions with loading/error
├── sources/sources.ts             # useSources(), useAddSource(), useRemoveSource()
├── sync/sync.ts                   # useSyncAll(), useSyncProgress()
└── library/library.ts             # useLibraryStats()
```

### Features (`src/features/`)

Legacy layer — being migrated to services + hooks. Each feature is self-contained with a barrel file. See [MIGRATION.md](./MIGRATION.md) for the transition plan.

### Screens (`app/`)

Thin Expo Router screens that wire hooks to UI. No business logic.

## Services Container

Services are instantiated lazily via a DI container. The container is provided to the React tree via `ServicesProvider`.

```typescript
// Creating a service
class SyncService extends EventEmitter<SyncServiceEvents> {
  #services: Services;

  constructor(services: Services) {
    super();
    this.#services = services;
  }

  #db = async () => {
    const databaseService = this.#services.get(DatabaseService);
    return databaseService.getInstance();
  };
}

// Consuming from a hook
const syncService = useService(SyncService);
```

Services access other services through the container, never by direct import. This keeps the dependency graph explicit and testable.

## Source Adapters

Each source type implements the `SourceAdapter` interface for fetching library data and resolving stream/artwork URLs. Adapters are stateless — they receive config from the `SourceRow` at construction, with no connect/restore lifecycle.

```typescript
type SourceAdapter = {
  getArtists(): Promise<Artist[]>;
  getAlbums(): Promise<Album[]>;
  getTracks(): Promise<Track[]>;
  getShows(): Promise<Show[]>;
  getEpisodes(): Promise<Episode[]>;
  getAudiobooks(): Promise<Audiobook[]>;
  getStreamUrl(sourceItemId: string, contentUrl?: string | null): string | Promise<string>;
  getArtworkUrl(itemId: string, size?: ImageSize): string;
};
```

### Adapter Registry

Adapters are created via a factory that dispatches on source type:

```typescript
const adapter = createAdapter(sourceRow); // SourceRow → SourceAdapter
```

Authentication is also dispatched through the registry — exchanging username/password for a token happens once at source-add time, and the resulting config is persisted.

### Jellyfin

Music source. Returns artists, albums, tracks. Authentication via `/Users/AuthenticateByName` → long-lived API key.

### Audiobookshelf

Podcast and audiobook source. Returns shows, episodes, audiobooks. Authentication via `/login` → JWT. Separate domain entities (no `mediaType` overloading).

## Database

### Schema (`database.schemas.ts`)

Zod schemas define the application-level shape of each entity. The database uses snake_case columns; schemas use camelCase. Parsing happens at the service boundary.

Separate tables per content type:
- **`sources`** — connection config stored as JSON text
- **`artists`** — music artists + synthesized ABS authors
- **`albums`** / **`tracks`** — music only
- **`shows`** / **`episodes`** — podcasts
- **`audiobooks`** — with JSON chapters array
- **`playlists`** / **`playlist_tracks`** — mix tapes
- **`queue`** — discriminated by type (track/episode/audiobook)
- **`playback_progress`** — keyed by (item_id, item_type)

### Migrations

Hand-written SQL migrations in `src/services/database/migrations/`. A `migrations` table tracks which have been applied. No Drizzle ORM — raw SQL via expo-sqlite's tagged template API.

### Web Support

The database layer has platform-specific implementations:
- **Native**: `database.create.ts` — expo-sqlite with `db.sql` tagged template
- **Web**: `database.create.web.ts` — sql.js with IndexedDB persistence and a `WebTaggedQuery` class that matches the expo-sqlite API

Both expose the same `{ sql, save }` interface. `save()` is a no-op on native (SQLite persists automatically) and writes to IndexedDB on web.

### ID Strategy

| Entity type | Function | Behavior |
|---|---|---|
| Synced from source | `stableId(sourceId, sourceItemId)` | Deterministic hash — stable across re-syncs |
| Local-only | `generateId()` | Random time-based |

## Reactive Hooks

### `useServiceQuery`

Subscribes to service events and re-runs a query when relevant events fire. No manual state patching — the query always returns fresh data.

```typescript
const { data, loading, error } = useServiceQuery({
  emitter: sourcesService,           // any EventEmitter
  query: () => sourcesService.findAll(),
  events: ['sourceAdded', 'sourceRemoved', 'sourceUpdated'],  // type-checked
});
```

Events are type-checked against the emitter's event map via a `Listenable<TEventMap>` structural type — no `any`.

### `useServiceMutation`

Wraps an async service method with loading/error state. Infers input/output types from the function.

```typescript
const { mutate, loading, error } = useServiceMutation(sourcesService.add);
```

## Sync Flow

```
1. User taps "Sync Library"
2. SyncService.syncAll(sources) called
3. For each source:
   a. Create adapter from SourceRow config
   b. Fetch artists, albums, tracks, shows, episodes, audiobooks
   c. INSERT OR REPLACE each entity with deterministic stableId
   d. Emit syncProgress events per phase
   e. Update source.lastSyncedAt
   f. Persist database (web)
4. Emit syncCompleted — hooks re-query stats
```

## Playback Flow

```
1. User taps track / album / episode
2. Playback store loads track(s) from SQLite
3. Resolve stream URL via adapter.getStreamUrl(sourceItemId)
4. Add to React Native Track Player queue
5. Track Player streams audio from source server
6. Lock screen / notification controls via PlaybackService
```

## Output Adapters

Each output implements `OutputAdapter` for playback control. The playback store delegates transport to the active output.

- **Local** — wraps React Native Track Player
- **Home Assistant** — routes commands via HA WebSocket API

See [OUTPUT-ADAPTERS.md](./OUTPUT-ADAPTERS.md) for details.
