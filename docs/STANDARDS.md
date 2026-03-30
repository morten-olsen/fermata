# Fermata — Coding Standards & Guidelines

## Principles

These standards serve the project's core philosophy: calm, focused, maintainable code that mirrors the calm, focused product we're building. Complexity is the enemy.

1. **Clarity over cleverness** — code should be obvious to read. If it needs a comment, consider rewriting it first.
2. **Thin layers** — each layer does one thing. Screens render. Stores orchestrate. Queries talk to the DB. Adapters talk to APIs.
3. **Contracts over implementations** — depend on interfaces, not concrete classes. The adapter pattern exists for a reason.
4. **Fail loudly** — errors should surface, not be silently swallowed. A user seeing an error message is better than silent data corruption.

---

## TypeScript

### Strict mode, always

The project uses `"strict": true`. Do not weaken it with `any`, `@ts-ignore`, or `as` casts unless there is a documented reason.

### Prefer `interface` over `type` for object shapes

```typescript
// Good
interface Track {
  id: string;
  title: string;
}

// Avoid for object shapes
type Track = {
  id: string;
  title: string;
};
```

Use `type` for unions, intersections, and computed types.

### No enums — use string literal unions

```typescript
// Good
type SourceType = "jellyfin" | "plex" | "local";

// Avoid
enum SourceType {
  Jellyfin = "jellyfin",
  ...
}
```

### Named exports for everything except screens

Screens (files in `app/`) use `export default` because Expo Router requires it. Everything else uses named exports.

```typescript
// src/stores/library.ts
export const useLibraryStore = create<LibraryState>(...);

// app/(tabs)/index.tsx
export default function LibraryScreen() { ... }
```

---

## React Native & Expo

### NativeWind for all styling

Use Tailwind classes via `className`. Do not use `StyleSheet.create` or inline `style` objects unless:
- You need dynamic values that can't be expressed in Tailwind (e.g., `Animated.Value`)
- You're in a non-NativeWind context (e.g., React Navigation theme config)

Custom colors use the `fermata-` prefix defined in `tailwind.config.js`:
```tsx
<View className="bg-fermata-bg">
  <Text className="text-fermata-text">Hello</Text>
</View>
```

### Screens are thin

Screens in `app/` should contain layout and event wiring only. Business logic lives in:
- **Stores** (`src/stores/`) for state management
- **Queries** (`src/db/queries.ts`) for data access
- **Adapters** (`src/adapters/`) for external API calls

```typescript
// Good — screen delegates to store
export default function SettingsScreen() {
  const { syncAll } = useSyncStore();
  const adapters = useSourcesStore((s) => s.getAllAdapters());
  return <Button onPress={() => syncAll(adapters)} />;
}

// Bad — business logic in screen
export default function SettingsScreen() {
  const onSync = async () => {
    const sources = await db.select().from(sourcesTable);
    for (const source of sources) { ... }
  };
}
```

### Icons

Use `Ionicons` from `@expo/vector-icons` consistently. Do not mix icon libraries.

---

## Database (Drizzle + SQLite)

### Schema is the source of truth

All table definitions live in `src/db/schema.ts`. After any schema change:
1. Edit `schema.ts`
2. Run `npx drizzle-kit generate`
3. Rebuild the app

Never write raw SQL. Use Drizzle's query builder.

### ID strategy

| Entity type | ID strategy | Function |
|-------------|-------------|----------|
| Synced from source (artists, albums, tracks) | Deterministic hash of `(sourceId, sourceItemId)` | `stableId()` |
| Local-only (mix tapes) | Random time-based | `generateId()` |

Deterministic IDs ensure that re-syncing never breaks foreign key references (e.g., mix tape → track).

### Transactions for batch writes

All bulk upserts must run inside `db.transaction()`. SQLite performance degrades dramatically without transaction batching, and partial writes can corrupt library state.

```typescript
// Good
await db.transaction(async (tx) => {
  for (const row of rows) {
    await tx.insert(table).values(row).onConflictDoUpdate(...);
  }
});

// Bad — N separate write locks
for (const row of rows) {
  await db.insert(table).values(row).onConflictDoUpdate(...);
}
```

### Artwork is a source item ID, not a URL

Store `artworkSourceItemId` in the database. Resolve the full URL at read time via the adapter's `getArtworkUrl()` method. This keeps DB rows independent of server URLs, base paths, or authentication tokens that may change.

### Pagination

Never `SELECT * FROM large_table` without a `LIMIT`. Tracks in particular can number in the tens of thousands. Use `limit` and `offset` parameters.

---

## Adapter Pattern

### The contract

All source adapters implement the `SourceAdapter` interface (`src/adapters/sources/types.ts`). All output adapters implement `OutputAdapter` (`src/adapters/outputs/types.ts`).

### No leaking implementation details

The sync engine and stores interact with adapters **only** through the interface. Never import a concrete adapter class outside of:
- The adapter's own directory
- The adapter registry (`src/adapters/sources/registry.ts`)

```typescript
// Good — registry creates the adapter
import { createAdapter } from "../adapters/sources/registry";
const adapter = createAdapter("jellyfin", id, name);

// Bad — store imports concrete class
import { JellyfinAdapter } from "../adapters/sources/jellyfin";
const adapter = new JellyfinAdapter(id, name);
```

### Adding a new source adapter

1. Create `src/adapters/sources/<name>/` with `api.ts` (raw API client) and `adapter.ts` (implements `SourceAdapter`)
2. Register it in `src/adapters/sources/registry.ts`
3. That's it — the sync engine, stores, and UI work automatically

---

## State Management (Zustand)

### One store per domain

| Store | Responsibility |
|-------|---------------|
| `sources` | Connected sources, adapter lifecycle |
| `sync` | Sync progress, errors, results |
| `library` | Library data for UI (albums, artists, stats) |
| `playback` | Queue, current track, transport controls |

### Stores don't read from other stores

If a store action needs data from another store, accept it as a function argument. This keeps stores independently testable.

```typescript
// Good — caller passes adapters in
syncAll: async (adapters: SourceAdapter[]) => { ... }

// Bad — store reaches into another store
syncAll: async () => {
  const adapters = useSourcesStore.getState().getAllAdapters();
}
```

### Stores don't import the DB client directly

Stores call functions from `db/queries.ts`. They never import `db` from `db/client.ts` or reference schema tables directly.

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | kebab-case or camelCase (match Expo Router conventions) | `schema.ts`, `sync.ts` |
| Components | PascalCase | `AlbumCard`, `MiniPlayer` |
| Stores | `use<Name>Store` | `useLibraryStore` |
| Interfaces | PascalCase, no `I` prefix | `SourceAdapter`, not `ISourceAdapter` |
| Type aliases | PascalCase | `AlbumRow`, `ImageSize` |
| Constants | camelCase (not SCREAMING_CASE) | `colors.fermataAccent` |
| DB tables | snake_case (Drizzle convention) | `mix_tape_tracks` |
| DB columns | snake_case | `source_item_id` |
| TS schema vars | camelCase (Drizzle exports) | `mixTapeTracks` |

---

## Error Handling

- **Adapters**: Throw descriptive errors. The caller (store/sync engine) catches and surfaces them.
- **Stores**: Catch errors in async actions and set error state for the UI to display.
- **Screens**: Read error state from stores. Never try/catch in render functions.
- **Never**: `catch (e) {}` — silent swallowing is a bug.

---

## File Organization

- **One concept per file**. A file named `sync.ts` contains the sync engine, not the sync engine + helper utilities + types.
- **Co-locate tests** next to the code they test: `sync.ts` → `sync.test.ts`.
- **Index files** re-export only the public API of a directory. Keep them minimal — no logic, no types.

---

## Git & Commits

- Commit messages describe *why*, not *what*. The diff shows what changed.
- One logical change per commit. Don't mix a bug fix with a feature.
- Branch names: `feat/<name>`, `fix/<name>`, `refactor/<name>`.

---

## Known Technical Debt

Track items here that are acknowledged but deferred:

- [ ] `accessToken` stored in plaintext SQLite — migrate to `expo-secure-store`
- [ ] `getDeviceId()` returns a hardcoded string — generate and persist a unique ID per device
- [ ] Search uses `LIKE '%query%'` (full table scan) — migrate to SQLite FTS5
- [ ] Album deduplication across sources — deferred to a future version
- [ ] `react-native-track-player` patched for RN 0.83 — monitor for upstream fix to remove patch
- [ ] `playback.ts` reads from `useSourcesStore.getState()` to resolve stream URLs — acceptable for now but violates the "stores don't read other stores" rule
- [ ] OutputAdapter interface not yet implemented — playback goes through RNTP directly via the playback store
