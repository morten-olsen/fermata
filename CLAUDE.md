# Fermata

A calm, multi-source media player built with Expo (React Native). Supports music (Jellyfin), podcasts, and audiobooks (Audiobookshelf).

## Tech Stack

- **Expo SDK 55** with Expo Router (file-based routing in `app/`)
- **NativeWind v4** (Tailwind CSS for React Native) — use `className` not `StyleSheet`
- **expo-sqlite** — local database with custom `DatabaseService` wrapper and manual migrations
- **expo-audio** — audio playback with `AudioPlaylist` (gapless queue, lock screen, background audio, web support)
- **TypeScript** — strict mode
- **ESLint 9** — flat config (`eslint.config.mjs`) enforcing architecture boundaries

## Architecture: Layered Organization

Code is organized into layers: **services** (business logic + data), **hooks** (React bindings), **components** (UI), and **shared** (cross-cutting infrastructure). Each domain (playback, sources, sync, etc.) appears as a subdirectory within the relevant layers.

```
src/
  services/                         # Business logic and data access
    database/                       # DatabaseService, schemas, migrations
    sources/                        # Source adapters (Jellyfin, Audiobookshelf)
      sources.ts                    # Barrel
      sources.adapter.ts            # SourceAdapter interface
      sources.registry.ts           # Factory: type → constructor
      jellyfin/
      audiobookshelf/
    playback/                       # Queue, transport, audio player
      playback.service.ts
      playback.player.ts
      playback.types.ts
      players/                      # Player implementations
    sync/                           # Pulling data from sources → DB
    downloads/                      # Offline / pinned content
    progress/                       # Playback progress (podcast/audiobook)
    outputs/                        # Output adapters (local, Home Assistant)
    albums/                         # Album queries
    artists/                        # Artist queries
    tracks/                         # Track queries
    shows/                          # Podcast show queries
    audiobooks/                     # Audiobook queries
    playlists/                      # Mix tape queries
    now-playing/                    # Now playing metadata service
    filesystem/                     # File system utilities

  hooks/                            # React hooks (bridge services → UI)
    playback/                       # usePlayback, transport controls
    library/                        # useAlbums, useTracks, etc.
    sources/                        # useSourceList, useAddSource
    sync/                           # useSyncState
    downloads/                      # useDownloads
    progress/                       # useProgress
    outputs/                        # useOutputs
    search/                         # useSearch
    albums/                         # useAlbum, useAlbumTracks
    artists/                        # useArtists
    shows/                          # useShows, useEpisodes
    audiobooks/                     # useAudiobooks, useChapters
    playlists/                      # usePlaylists
    tracks/                         # useTracks
    service/                        # useService (DI provider)

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
    services-provider.tsx           # DI context provider

  shared/                           # Cross-cutting infrastructure
    lib/
      ids.ts                        # stableId(), generateId()
      format.ts                     # formatDuration()
      log.ts                        # Dev-only logging
      alphabet.ts                   # Letter extraction for scrubbers
    theme/
      theme.ts                      # Barrel (colors + nav theme)

  utils/                            # Standalone utilities
    utils.id.ts                     # ID generation
    utils.event-emitter.ts          # Typed event emitter

app/                                # Expo Router screens (thin, delegate to hooks/services)
patches/                            # patch-package patches
docs/                               # Architecture, design, standards, code guidelines
```

## Key Patterns

- **All files kebab-case** — no PascalCase filenames. Components: `album-card.tsx`. Services: `playback.service.ts`.
- **Named exports only** — no default exports except screens (Expo Router requires them).
- **NativeWind everywhere** — use Tailwind classes via `className`. Custom colors prefixed `fermata-` (e.g. `bg-fermata-bg`, `text-fermata-accent`). No `StyleSheet.create`.
- **Schema in code** — table types defined in `src/services/database/database.schemas.ts`. Migrations managed manually in `src/services/database/migrations/`.
- **DB access through services** — each domain has its own service. No direct database imports outside service files.
- **Adapter registry** — source adapters created via `createAdapter(type, id, name)` from `sources.registry.ts`. Output adapters via `createOutputAdapter(type, id, name)` from `outputs.registry.ts`. Never import concrete adapter classes outside their own directory.
- **Output adapters** — playback delegates transport to the active `OutputAdapter` (local or network like Home Assistant). Queue stays in the playback service; adapter handles play/pause/seek/volume.
- **Library sync, not live fetch** — UI reads from local SQLite, never remote APIs directly.
- **Artwork is a source item ID** — DB stores `artworkSourceItemId`, not URLs. Resolve via `resolveArtworkUrl()` at read time.
- **expo-audio playback** — `AudioPlaylist` for gapless queue, `AudioPlayer` for lock screen metadata. Background audio via `setAudioModeAsync`.
- **Media types** — `albums` and `tracks` have a `mediaType` column: `'music' | 'podcast' | 'audiobook'`. Defaults to `'music'`.
- **Playback progress** — `playback_progress` table tracks position/completion for podcast and audiobook tracks. `needsSync` flag enables offline-first bidirectional sync. Not used for music.
- **Scoped sourceItemId** — Audiobookshelf episodes/chapters use `"{libraryItemId}:{subId}"` format since they're nested under library items.
- **Mix tapes** — Fermata's term for playlists.
- **Services are decoupled** — services don't import other services directly; dependencies passed as arguments.
- **Screens are thin** — business logic lives in services and hooks, not in `app/` files.
- **Compound components** — complex UI uses Radix-like compound pattern: `MediaRow.Track`, `MediaCard.Album`, `BottomSheet.Item`, `DetailHeader.Root`. Presets for standard layouts, composable sub-components for custom ones.
- **Responsive design** — breakpoints in `tailwind.config.js` (sm/md/lg/xl). Use NativeWind responsive prefixes (`sm:px-6 md:px-8`) or hooks (`useBreakpoint()`, `useColumns()`, `useResponsiveValue()`) for imperative logic.
- **Design system in `src/components/`** — grouped by function (primitives, controls, feedback, navigation, layout, data-display). Each group has a barrel file. `src/shared/` is for non-UI infrastructure only.

## Import Conventions

- **Within a layer**: relative imports (`./playback.service`)
- **Hooks → services**: `@/src/services/playback/playback.service`
- **Components → hooks**: `@/src/hooks/playback/playback`
- **From components**: barrel import (`@/src/components/primitives/primitives`, `@/src/components/layout/layout`)
- **From shared**: direct path (`@/src/shared/theme/theme`, `@/src/shared/lib/log`)
- **Import order**: React → third-party → services → hooks → components → shared → relative
- **`import type`** for type-only imports

## Commands

```bash
npx expo start           # Dev server
npx expo run:ios         # Build & run iOS
npx expo run:android     # Build & run Android
npx expo start --web     # Web
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run storybook        # Design system on port 6006
npm run build-storybook  # Static Storybook build
```

## Docs

- `docs/CODE-GUIDELINES.md` — definitive code standards reference
- `docs/ARCHITECTURE.md` — system architecture and data flow
- `docs/DESIGN-SYSTEM.md` — colors, typography, spacing, component patterns
- `docs/DESIGN.md` — design philosophy and inspiration
- `docs/OUTPUT-ADAPTERS.md` — output adapter design (Spotify Connect-like speaker routing)
- `docs/AUDIOBOOKSHELF.md` — Audiobookshelf adapter: API, data mapping, compound IDs, progress sync
- `docs/PROGRESS-TRACKING.md` — playback progress: schema, local tracking, bidirectional sync protocol
- `docs/MIGRATION.md` — migration guide: features → services architecture, status tracker

## License

GPL-3.0
