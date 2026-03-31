# Fermata

A calm, multi-source music player built with Expo (React Native).

## Tech Stack

- **Expo SDK 55** with Expo Router (file-based routing in `app/`)
- **NativeWind v4** (Tailwind CSS for React Native) — use `className` not `StyleSheet`
- **Drizzle ORM** with **expo-sqlite** — typed schema, queries, and migrations
- **react-native-track-player v5** — audio playback (requires dev build, not Expo Go). Alpha version needed for RN 0.83 new arch compatibility.
- **Zustand** — state management
- **TypeScript** — strict mode
- **ESLint 9** — flat config (`eslint.config.mjs`) enforcing architecture boundaries

## Architecture: Feature-Based Organization

Code is organized by **domain feature**. Each feature is self-contained with a barrel file (`{feature}.ts`) defining its public API. Cross-feature imports go through the barrel only — enforced by ESLint.

```
src/
  features/
    playback/                     # Queue, transport, now playing
      playback.ts                 # Barrel (public API)
      playback.store.ts           # Zustand store
      playback.service.ts         # RNTP background service
      playback.types.ts           # OutputAdapter interface
      components/
        player-overlay.tsx
        queue-sheet.tsx
        equalizer-bars.tsx

    library/                      # Browsing, display, search
      library.ts                  # Barrel
      library.store.ts
      library.queries.ts          # Read queries
      track-actions.ts
      components/
        album-card.tsx
        album-grid.tsx
        artist-row.tsx
        artist-section-list.tsx
        track-row.tsx
        track-list.tsx
        playlist-row.tsx
        library.context.tsx       # TrackActionsContext

    sources/                      # Connecting to external servers
      sources.ts                  # Barrel
      sources.store.ts
      sources.queries.ts          # Source CRUD queries
      sources.types.ts            # SourceAdapter interface
      sources.registry.ts         # Factory: type → constructor
      jellyfin/
        jellyfin.ts               # Barrel
        jellyfin.api.ts
        jellyfin.adapter.ts

    sync/                         # Pulling data from sources → DB
      sync.ts                     # Barrel
      sync.store.ts
      sync.engine.ts
      sync.queries.ts             # Write queries (upserts)

    downloads/                    # Offline / pinned content
      downloads.ts                # Barrel
      downloads.store.ts
      downloads.service.ts
      downloads.queries.ts

    artwork/                      # Artwork resolution and caching
      artwork.ts                  # Barrel
      artwork.resolve.ts
      artwork.cache.ts
      artwork.use-image-colors.ts

  shared/                         # Cross-cutting infrastructure
    db/
      db.ts                       # Barrel
      db.schema.ts                # Drizzle table definitions (source of truth)
      db.client.ts                # Drizzle client
    components/                   # UI primitives (EmptyState, SegmentedControl, etc.)
    lib/
      ids.ts                      # stableId(), generateId()
      format.ts                   # formatDuration()
      log.ts                      # Dev-only logging
      alphabet.ts                 # Letter extraction for scrubbers
    theme/
      theme.ts                    # Barrel (colors + nav theme)

app/                              # Expo Router screens (thin, delegate to features)
drizzle/                          # Generated SQL migrations
patches/                          # patch-package patches
docs/                             # Architecture, design, standards, code guidelines
```

## Key Patterns

- **Feature barrels** — every feature has `{feature}/{feature}.ts` as its public API. Import via barrel only. No `index.ts` files.
- **All files kebab-case** — no PascalCase filenames. Components: `album-card.tsx`. Stores: `library.store.ts`. Hooks: `artwork.use-image-colors.ts`.
- **Named exports only** — no default exports except screens (Expo Router requires them).
- **NativeWind everywhere** — use Tailwind classes via `className`. Custom colors prefixed `fermata-` (e.g. `bg-fermata-bg`, `text-fermata-accent`). No `StyleSheet.create`.
- **Drizzle schema is the source of truth** — define tables in `shared/db/db.schema.ts`, run `npx drizzle-kit generate`. Never write raw SQL.
- **Feature queries own their DB access** — each feature has its own `{feature}.queries.ts`. No direct `db` client imports outside query files.
- **Adapter registry** — adapters created via `createAdapter(type, id, name)` from `sources.registry.ts`. Never import concrete adapter classes outside their own directory.
- **Library sync, not live fetch** — UI reads from local SQLite, never remote APIs directly.
- **Artwork is a source item ID** — DB stores `artworkSourceItemId`, not URLs. Resolve via `resolveArtworkUrl()` at read time.
- **Deterministic IDs** — `stableId(sourceId, sourceItemId)` for synced entities, `generateId()` for local-only. Both in `shared/lib/ids.ts`.
- **Lazy Track Player** — loaded via `require()` in try/catch. App works in Expo Go without audio.
- **Mix tapes** — Fermata's term for playlists.
- **Stores are decoupled** — Zustand stores don't import other stores directly; dependencies passed as arguments.
- **Screens are thin** — business logic lives in feature stores and queries, not in `app/` files.

## Import Conventions

- **Within a feature**: relative imports (`./library.store`)
- **Between features**: barrel import (`@/src/features/playback/playback`)
- **From shared**: direct path (`@/src/shared/theme/theme`, `@/src/shared/lib/log`)
- **Import order**: React → third-party → features → shared → relative
- **`import type`** for type-only imports

## Dependency Graph

```
sources     ← (leaf)
artwork     ← sources
library     ← sources, artwork, playback, downloads
playback    ← sources, library, downloads, artwork
sync        ← sources, library, artwork
downloads   ← sources, library
shared      ← no feature deps
```

Enforced by `eslint-plugin-boundaries`. No feature imports `sync` except through the sync barrel from screens.

## Commands

```bash
npx expo start           # Dev server (Expo Go — no audio)
npx expo run:ios         # Build & run iOS (dev build, full audio)
npx expo run:android     # Build & run Android
npx drizzle-kit generate # Generate migrations after schema changes
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
```

## Docs

- `docs/CODE-GUIDELINES.md` — definitive code standards reference
- `docs/ARCHITECTURE.md` — system architecture and data flow
- `docs/DESIGN-SYSTEM.md` — colors, typography, spacing, component patterns
- `docs/DESIGN.md` — design philosophy and inspiration
- `docs/STANDARDS.md` — coding principles (superseded by CODE-GUIDELINES.md)

## License

GPL-3.0
