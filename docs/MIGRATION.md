# Fermata — Migration Guide: Features → Services

This document tracks the migration from the PoC feature-based architecture (Zustand stores + Drizzle ORM) to the production service layer (plain classes + raw SQL + reactive hooks).

## Why

The PoC architecture served its purpose but has scaling issues:

- **Zustand stores mix concerns** — state, async actions, DB queries, and adapter lifecycle all in one file
- **Drizzle ORM overhead** — adds complexity for what are mostly simple queries, and doesn't support web without a separate driver
- **Tight coupling** — stores import other stores, making testing and refactoring difficult
- **No web support** — the old DB layer was native-only

The new architecture separates concerns cleanly:

| Layer | Responsibility | Old | New |
|-------|---------------|-----|-----|
| Data access | SQL, persistence | Drizzle ORM + `{feature}.queries.ts` | `DatabaseService` + raw SQL in services |
| Business logic | Domain operations, events | Zustand stores | Services (`EventEmitter` classes) |
| React binding | Reactive state for UI | `useStore((s) => s.thing)` | `useServiceQuery` / `useServiceMutation` hooks |
| UI | Screens, components | Same | Same (screens just use hooks instead of stores) |

## How to Migrate a Feature

### 1. Create the service

Create `src/services/{name}/{name}.ts` following the established pattern:

```typescript
class MyService extends EventEmitter<MyServiceEvents> {
  #services: Services;

  constructor(services: Services) {
    super();
    this.#services = services;
  }

  #db = async () => {
    const databaseService = this.#services.get(DatabaseService);
    return databaseService.getInstance();
  };

  public findAll = async () => {
    const db = await this.#db();
    return db.sql<RawRow>`SELECT * FROM my_table`;
  };
}
```

Key patterns:
- Extend `EventEmitter` with typed events
- Accept `Services` container in constructor
- Use `#db()` helper for database access
- Call `db.save()` after writes (no-op on native, persists on web)
- Emit events after mutations so hooks can react

### 2. Create hooks

Create `src/hooks/{name}/{name}.ts`:

```typescript
// List hook — re-queries on events
const useMyItems = () => {
  const service = useService(MyService);
  const query = useCallback(() => service.findAll(), [service]);
  return useServiceQuery({
    emitter: service,
    query,
    events: ['itemAdded', 'itemRemoved'],
  });
};

// Mutation hook — infers types from service method
const useAddItem = () => {
  const service = useService(MyService);
  return useServiceMutation(service.add);
};
```

### 3. Update screens

Replace Zustand store usage with hooks:

```typescript
// Before
const { items, addItem } = useMyStore(useShallow((s) => ({
  items: s.items,
  addItem: s.addItem,
})));

// After
const { data: items } = useMyItems();
const { mutate: addItem } = useAddItem();
```

### 4. Add schemas and migrations

- Add Zod schemas to `database.schemas.ts`
- Add SQL tables to the init migration (or a new migration)
- Use snake_case for DB columns, camelCase for Zod schemas
- Parse at the service boundary (raw row → Zod parse → domain type)

## Migration Status

### Completed

| Feature | Old Location | New Location | Notes |
|---------|-------------|-------------|-------|
| Sources CRUD | `features/sources/sources.store.ts` | `services/sources/sources.ts` | Auth, add, remove, list. Config stored as JSON. |
| Source adapters | `features/sources/{adapter}/` | `services/sources/{adapter}/` | Stateless — config from SourceRow, no connect/restore lifecycle. |
| Source adapter types | `features/sources/sources.types.ts` | `services/sources/sources.adapter.ts` | Separate entity types (Show, Episode, Audiobook) instead of mediaType overloading. |
| Sync engine | `features/sync/sync.engine.ts` | `services/sync/sync.ts` | Event-based progress, INSERT OR REPLACE, no chunked upserts. |
| Sync UI state | `features/sync/sync.store.ts` | `hooks/sync/sync.ts` | `useSyncAll()`, `useSyncProgress()` |
| Library stats | `features/library/library.store.ts` (stats) | `services/sync/sync.ts` (`getStats`) | Counts from all entity tables. |
| Database layer | `shared/db/` (Drizzle) | `services/database/` | Raw SQL, Zod validation, web support via sql.js. |
| Downloads | `features/downloads/` | `services/downloads/downloads.ts` | Polymorphic `(itemId, itemType)` key supports tracks, episodes, audiobooks. Centralized queue, retries, filesystem. Pins resolve to downloadable items via entity queries. |

### Not Yet Migrated

| Feature | Old Location | Blocked By | Notes |
|---------|-------------|-----------|-------|
| Library browsing | `features/library/` | — | Read queries for albums, tracks, artists, shows, episodes, audiobooks. |
| Playback | `features/playback/` | Library | Queue management, transport, RNTP integration. |
| Artwork | `features/artwork/` | — | URL resolution, filesystem cache, color extraction. |
| Outputs | `features/outputs/` | Playback | Output adapter lifecycle, speaker routing. |
| Progress tracking | `features/progress/` | Sync | Bidirectional sync, local tracking for episodes/audiobooks. |
| Playlists | `features/library/` (playlists) | Library | Mix tapes, playlist sync. |

## Coexistence

During migration, both systems run side by side:

- The old `shared/db/` (Drizzle + `fermata.db`) continues to serve unmigrated features
- The new `services/database/` uses a separate database (`data.db` / `library` on web)
- `ServicesProvider` wraps the app alongside existing providers
- Screens can use both old stores and new hooks simultaneously
- Old features are removed once all their consumers are migrated

## Database Differences

| Aspect | Old (Drizzle) | New (Services) |
|--------|-------------|----------------|
| ORM | Drizzle | Raw SQL (tagged template) |
| Schema source of truth | `db.schema.ts` (Drizzle tables) | `database.schemas.ts` (Zod) + migration SQL |
| Migrations | `drizzle-kit generate` | Hand-written in `migrations/` |
| Column naming | snake_case in SQL, camelCase in TS | snake_case in SQL, camelCase in Zod schemas |
| Web support | sql.js via `db.client.web.ts` | sql.js via `database.create.web.ts` |
| Content model | Overloaded `albums`/`tracks` with `mediaType` | Separate `albums`, `tracks`, `shows`, `episodes`, `audiobooks` |
| Source config | Flat columns (`base_url`, `user_id`, `access_token`) | JSON `config` column |
