# Fermata

A calm, multi-source music player built with Expo (React Native).

## Tech Stack

- **Expo SDK 55** with Expo Router (file-based routing in `app/`)
- **NativeWind v4** (Tailwind CSS for React Native) — use `className` not `StyleSheet`
- **Drizzle ORM** with **expo-sqlite** — typed schema, queries, and migrations
- **react-native-track-player v5** — audio playback (requires dev build, not Expo Go). Alpha version needed for RN 0.83 new arch compatibility.
- **Zustand** — state management
- **TypeScript** — strict mode

## Project Structure

```
app/                    # Expo Router screens (file-based routing)
  (tabs)/
    library/            # Library tab stack (index, album/[id], artist/[name], mixtape/[id])
    search/             # Search tab stack
    settings/           # Settings tab stack (index, add-source)
  player.tsx            # Now Playing modal
src/
  adapters/
    sources/
      types.ts          # SourceAdapter interface (connect, restore, sync, stream, artwork)
      registry.ts       # Adapter factory — maps type strings to constructors
      jellyfin/         # Jellyfin implementation (api.ts, adapter.ts)
    outputs/
      types.ts          # OutputAdapter interface
  db/
    schema.ts           # Drizzle table definitions (source of truth)
    client.ts           # Drizzle client initialization
    queries.ts          # Typed query functions (CRUD, search, upserts)
    sync.ts             # Sync engine (pulls from adapters → upserts to SQLite)
  stores/
    sources.ts          # Connected sources management
    sync.ts             # Sync progress/status
    library.ts          # Library data for UI (albums, artists, stats)
    playback.ts         # Playback queue, current track, transport controls
  services/
    playback-service.ts # RNTP background service (lock screen / notification controls)
  lib/
    artwork.ts          # Resolve artworkSourceItemId → URL via adapter
  theme/                # Colors, nav theme
  components/
    player/             # MiniPlayer
    library/            # AlbumCard, ArtistRow, TrackRow, MixTapeCard
    common/             # EmptyState, SegmentedControl
drizzle/                # Generated SQL migrations (via drizzle-kit)
patches/                # patch-package patches (RNTP RN 0.83 fix)
docs/                   # Architecture, design, standards documentation
```

## Key Patterns

- **NativeWind everywhere** — use Tailwind classes via `className`. Custom colors are prefixed `fermata-` (e.g. `bg-fermata-bg`, `text-fermata-accent`). Avoid inline styles and `StyleSheet.create`.
- **Drizzle schema is the source of truth** — define tables in `src/db/schema.ts`, then run `npx drizzle-kit generate` to create migrations. Never write raw SQL.
- **Adapter registry** — adapters are created via `createAdapter(type, id, name)` from `registry.ts`. Never import concrete adapter classes outside of `registry.ts` or the adapter's own directory.
- **Library sync, not live fetch** — the UI reads from local SQLite via Drizzle, never directly from remote APIs. Sync is incremental.
- **Artwork is a source item ID** — DB stores `artworkSourceItemId`, not URLs. Resolve via `resolveArtworkUrl()` or `adapter.getArtworkUrl()` at read time.
- **Deterministic IDs for synced entities** — `stableId(sourceId, sourceItemId)` ensures IDs survive re-syncs. `generateId()` for local-only entities (mix tapes).
- **Lazy Track Player** — `react-native-track-player` is loaded via `require()` in a try/catch. App works in Expo Go without audio; dev builds get full playback.
- **Mix tapes** — Fermata's term for playlists. Locally stored, cross-source, first-class feature.
- **Stores are thin, decoupled** — Zustand stores call query functions from `db/queries.ts`. Stores never import other stores; dependencies are passed as arguments.

## Conventions

- Use `@/` path alias for imports from project root
- Prefer named exports over default exports for non-screen components
- Keep screens thin — business logic lives in stores and adapters
- Use Ionicons (`@expo/vector-icons/Ionicons`) for icons
- Use `stableId()` for synced entity IDs, `generateId()` for local entities
- Wrap bulk DB writes in `db.transaction()`

## Commands

```bash
npx expo start          # Start dev server (Expo Go — no audio)
npx expo run:ios        # Build & run on iOS (dev build, full audio)
npx expo run:android    # Build & run on Android (dev build, full audio)
npx drizzle-kit generate # Generate migrations after schema changes
```

## License

GPL-3.0
