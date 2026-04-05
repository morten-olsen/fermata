# Fermata

A calm, multi-source media player built with Expo (React Native). Supports music (Jellyfin), podcasts, and audiobooks (Audiobookshelf).

## Tech Stack

- **Expo SDK 55** with Expo Router (file-based routing in `app/`)
- **NativeWind v4** (Tailwind CSS for React Native) — use `className` not `StyleSheet`
- **Drizzle ORM** with **expo-sqlite** — typed schema, queries, and migrations
- **expo-audio** — audio playback with `AudioPlaylist` (gapless queue, lock screen, background audio, web support)
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
      audiobookshelf/
        audiobookshelf.ts         # Barrel
        audiobookshelf.api.ts
        audiobookshelf.adapter.ts
        audiobookshelf.types.ts

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

    progress/                     # Playback progress tracking (podcast/audiobook)
      progress.ts                 # Barrel
      progress.types.ts
      progress.queries.ts
      progress.service.ts

    artwork/                      # Artwork resolution and caching
      artwork.ts                  # Barrel
      artwork.resolve.ts
      artwork.cache.ts
      artwork.use-image-colors.ts

    outputs/                      # Output adapters (Spotify Connect-like)
      outputs.ts                  # Barrel
      outputs.store.ts            # Active output, connection lifecycle
      outputs.types.ts            # OutputAdapter interface
      outputs.registry.ts         # Factory: type → constructor
      outputs.queries.ts          # Persisted output configs
      components/
        output-picker.tsx
      local/
        local.ts                  # Barrel
        local.adapter.ts          # Wraps RNTP
      home-assistant/
        home-assistant.ts         # Barrel
        home-assistant.adapter.ts
        home-assistant.api.ts     # HA WebSocket client
        home-assistant.types.ts

  components/                       # Design system (composable, responsive)
    components.ts                   # Top-level barrel
    primitives/                     # PressableScale, Artwork, SourceArtwork
      primitives.ts                 # Barrel
    controls/                       # ActionButton, SegmentedControl, Slider
      controls.ts
    feedback/                       # ProgressBar, EmptyState
      feedback.ts
    navigation/                     # NavBar, AlphabetScrubber
      navigation.ts
    layout/                         # BottomSheet, HorizontalList, SectionHeader, responsive hooks
      layout.ts
      responsive.tsx                # useBreakpoint(), useColumns(), useResponsiveValue()
    data-display/                   # DetailHeader, SettingsRow, StatRow, MediaRow, MediaCard
      data-display.ts
      media-row.tsx                 # Compound: MediaRow.Track, .Episode, .Chapter
      media-card.tsx                # Compound: MediaCard.Album, .Show, .Book
    media/                          # AlbumGrid, BookGrid, TrackList, ArtistRow, etc.
    playback/                       # PlayerOverlay, NowPlaying, QueueSheet, EqualizerBars
    library/                        # TrackActions
    outputs/                        # OutputPicker

  shared/                           # Cross-cutting infrastructure
    db/
      db.ts                         # Barrel
      db.schema.ts                  # Drizzle table definitions (source of truth)
      db.client.ts                  # Drizzle client
    lib/
      ids.ts                        # stableId(), generateId()
      format.ts                     # formatDuration()
      log.ts                        # Dev-only logging
      alphabet.ts                   # Letter extraction for scrubbers
    theme/
      theme.ts                      # Barrel (colors + nav theme)

app/                                # Expo Router screens (thin, delegate to features)
drizzle/                            # Generated SQL migrations
patches/                            # patch-package patches
docs/                               # Architecture, design, standards, code guidelines
```

## Key Patterns

- **Feature barrels** — every feature has `{feature}/{feature}.ts` as its public API. Import via barrel only. No `index.ts` files.
- **All files kebab-case** — no PascalCase filenames. Components: `album-card.tsx`. Stores: `library.store.ts`. Hooks: `artwork.use-image-colors.ts`.
- **Named exports only** — no default exports except screens (Expo Router requires them).
- **NativeWind everywhere** — use Tailwind classes via `className`. Custom colors prefixed `fermata-` (e.g. `bg-fermata-bg`, `text-fermata-accent`). No `StyleSheet.create`.
- **Drizzle schema is the source of truth** — define tables in `shared/db/db.schema.ts`, run `npx drizzle-kit generate`. Never write raw SQL.
- **Feature queries own their DB access** — each feature has its own `{feature}.queries.ts`. No direct `db` client imports outside query files.
- **Adapter registry** — source adapters created via `createAdapter(type, id, name)` from `sources.registry.ts`. Output adapters via `createOutputAdapter(type, id, name)` from `outputs.registry.ts`. Never import concrete adapter classes outside their own directory.
- **Output adapters** — playback store delegates transport to the active `OutputAdapter` (local RNTP or network like Home Assistant). Queue stays in the store; adapter handles play/pause/seek/volume. Battery-conscious: network adapters disconnect when backgrounded and idle.
- **Library sync, not live fetch** — UI reads from local SQLite, never remote APIs directly.
- **Artwork is a source item ID** — DB stores `artworkSourceItemId`, not URLs. Resolve via `resolveArtworkUrl()` at read time.
- **Deterministic IDs** — `stableId(sourceId, sourceItemId)` for synced entities, `generateId()` for local-only. Both in `shared/lib/ids.ts`.
- **expo-audio playback** — `AudioPlaylist` for gapless queue, `AudioPlayer` for lock screen metadata. Background audio via `setAudioModeAsync`.
- **Media types** — `albums` and `tracks` have a `mediaType` column: `'music' | 'podcast' | 'audiobook'`. Defaults to `'music'`. Library queries accept an optional `mediaType` filter.
- **Playback progress** — `playback_progress` table tracks position/completion for podcast and audiobook tracks. `needsSync` flag enables offline-first bidirectional sync. Not used for music. `QueueTrack.tracksProgress` boolean (pre-computed from `mediaType`) avoids runtime type checks during playback.
- **Scoped sourceItemId** — Audiobookshelf episodes/chapters use `"{libraryItemId}:{subId}"` format since they're nested under library items. Parsed by `splitSourceItemId()` in the adapter. Streaming path, chapter offsets, and artwork IDs are separate DB columns (`contentUrl`, `chapterStartMs`, `artworkSourceItemId` on tracks), not packed into the ID.
- **Mix tapes** — Fermata's term for playlists.
- **Stores are decoupled** — Zustand stores don't import other stores directly; dependencies passed as arguments.
- **Screens are thin** — business logic lives in feature stores and queries, not in `app/` files.
- **Compound components** — complex UI uses Radix-like compound pattern: `MediaRow.Track`, `MediaCard.Album`, `BottomSheet.Item`, `DetailHeader.Root`. Presets for standard layouts, composable sub-components for custom ones.
- **Responsive design** — breakpoints in `tailwind.config.js` (sm/md/lg/xl). Use NativeWind responsive prefixes (`sm:px-6 md:px-8`) or hooks (`useBreakpoint()`, `useColumns()`, `useResponsiveValue()`) for imperative logic.
- **Design system in `src/components/`** — grouped by function (primitives, controls, feedback, navigation, layout, data-display). Each group has a barrel file. `src/shared/` is for non-UI infrastructure only.

## Import Conventions

- **Within a feature**: relative imports (`./library.store`)
- **Between features**: barrel import (`@/src/features/playback/playback`)
- **From components**: barrel import (`@/src/components/primitives/primitives`, `@/src/components/layout/layout`)
- **From shared**: direct path (`@/src/shared/theme/theme`, `@/src/shared/lib/log`)
- **Import order**: React → third-party → features → components → shared → relative
- **`import type`** for type-only imports

## Dependency Graph

```
sources     ← (leaf)
progress    ← (leaf)
outputs     ← sources
artwork     ← sources
library     ← sources, artwork, playback, downloads
playback    ← sources, library, downloads, artwork, outputs, progress
sync        ← sources, library, artwork, progress
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
- `docs/OUTPUT-ADAPTERS.md` — output adapter design (Spotify Connect-like speaker routing)
- `docs/AUDIOBOOKSHELF.md` — Audiobookshelf adapter: API, data mapping, compound IDs, progress sync
- `docs/PROGRESS-TRACKING.md` — playback progress: schema, local tracking, bidirectional sync protocol
- `docs/MIGRATION.md` — migration guide: features → services architecture, status tracker

## License

GPL-3.0
