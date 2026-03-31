# Fermata — Code Guidelines

The definitive reference for how code is written in Fermata. Every rule here exists to keep the codebase consistent, readable, and maintainable. When in doubt, follow these guidelines. When a guideline doesn't cover a case, follow the spirit: clarity over cleverness, consistency over preference.

---

## Table of Contents

1. [Architecture: Feature-Based Organization](#architecture-feature-based-organization)
2. [File Naming](#file-naming)
3. [Imports](#imports)
4. [TypeScript](#typescript)
5. [Components](#components)
6. [Hooks](#hooks)
7. [State Management](#state-management)
8. [Styling](#styling)
9. [Screens](#screens)
10. [Database](#database)
11. [Error Handling](#error-handling)
12. [Async Patterns](#async-patterns)
13. [Logging](#logging)

---

## Architecture: Feature-Based Organization

Code is organized by **domain feature**, not by technical type. Each feature is a self-contained directory with its own store, queries, services, hooks, components, and types — whatever it needs. A barrel file defines the feature's public API. Other features import only through the barrel.

This is a lightweight monorepo: each feature directory is like a package with a public API and private internals, without the tooling overhead.

### The structure

```
src/
├── features/
│   ├── playback/                       # Queue, transport, now playing
│   │   ├── playback.ts                 # Barrel: public API
│   │   ├── playback.store.ts           # Zustand store
│   │   ├── playback.service.ts         # RNTP background service
│   │   ├── playback.types.ts           # OutputAdapter interface
│   │   └── components/                 # Feature-specific UI
│   │       ├── player-overlay.tsx
│   │       ├── queue-sheet.tsx
│   │       └── equalizer-bars.tsx
│   │
│   ├── library/                        # Browsing, display, search
│   │   ├── library.ts                  # Barrel
│   │   ├── library.store.ts
│   │   ├── library.queries.ts          # Read queries (getAllAlbums, search, stats)
│   │   ├── track-actions.ts
│   │   └── components/                 # Feature-specific UI
│   │       ├── album-card.tsx
│   │       ├── album-grid.tsx
│   │       ├── artist-row.tsx
│   │       ├── artist-section-list.tsx
│   │       ├── track-row.tsx
│   │       ├── track-list.tsx
│   │       ├── playlist-row.tsx
│   │       └── library.context.tsx     # TrackActionsContext (imperative UI)
│   │
│   ├── sources/                        # Connecting to external servers
│   │   ├── sources.ts                  # Barrel
│   │   ├── sources.store.ts
│   │   ├── sources.queries.ts          # Source CRUD queries
│   │   ├── sources.types.ts            # SourceAdapter interface, SourceConfig, etc.
│   │   ├── sources.registry.ts         # Factory: type string → adapter constructor
│   │   └── jellyfin/                   # One directory per adapter implementation
│   │       ├── jellyfin.ts             # Barrel (re-exports adapter)
│   │       ├── jellyfin.api.ts         # Raw HTTP client
│   │       └── jellyfin.adapter.ts     # SourceAdapter implementation
│   │
│   ├── sync/                           # Pulling data from sources → DB
│   │   ├── sync.ts                     # Barrel
│   │   ├── sync.store.ts
│   │   ├── sync.engine.ts              # Sync engine (adapter → DB writes)
│   │   └── sync.queries.ts             # Write queries (upsertAlbums, upsertTracks)
│   │
│   ├── downloads/                      # Offline / pinned content
│   │   ├── downloads.ts                # Barrel
│   │   ├── downloads.store.ts
│   │   ├── downloads.service.ts        # Download queue manager
│   │   └── downloads.queries.ts
│   │
│   └── artwork/                        # Artwork resolution and caching
│       ├── artwork.ts                  # Barrel
│       ├── artwork.resolve.ts          # Resolve artworkSourceItemId → URL
│       ├── artwork.cache.ts            # Filesystem cache
│       └── artwork.use-image-colors.ts # Hook: extract colors from artwork
│
├── shared/                             # Truly cross-cutting infrastructure
│   ├── db/
│   │   ├── db.ts                       # Barrel (re-exports client + schema)
│   │   ├── db.schema.ts                # Drizzle table definitions (source of truth)
│   │   └── db.client.ts                # Drizzle client initialization
│   ├── components/                     # UI primitives used across features
│   │   ├── empty-state.tsx
│   │   ├── segmented-control.tsx
│   │   └── pressable-scale.tsx
│   ├── lib/                            # Pure utilities (no React, no side effects, no feature imports)
│   │   ├── ids.ts                      # stableId(), generateId()
│   │   ├── format.ts                   # formatDuration(), etc.
│   │   └── log.ts                      # Dev-only logging
│   └── theme/
│       └── theme.ts                    # Colors, React Navigation theme
│
drizzle/                                # Generated SQL migrations (via drizzle-kit)
patches/                                # patch-package patches

app/                                    # Expo Router screens (file-based routing)
├── _layout.tsx                         # Root layout (providers, initialization)
├── (tabs)/
│   ├── _layout.tsx                     # Tab navigator config
│   ├── library/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── album/[id].tsx
│   │   ├── artist/[name].tsx
│   │   └── mixtape/[id].tsx
│   ├── search/
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   └── settings/
│       ├── _layout.tsx
│       ├── index.tsx
│       └── add-source.tsx
└── player.tsx                          # Now Playing modal
```

### Dependency graph

Features may depend on other features — but only through their barrel. The graph is enforced by ESLint (`eslint-plugin-boundaries`).

```
sources     ← (leaf)
artwork     ← sources
library     ← sources, artwork, playback, downloads
playback    ← sources, library, downloads, artwork
sync        ← sources, library, artwork
downloads   ← sources, library
```

`shared/` is available to all features. Features never depend on `app/`.

### The barrel rule

Every feature has a barrel file named `{feature}/{feature}.ts` that explicitly exports its public API. **Import from the barrel, never reach into a feature's internals.**

```typescript
// features/playback/playback.ts — the barrel
export { usePlaybackStore } from "./playback.store";
export { MiniPlayer } from "./mini-player";
export type { PlaybackState } from "./playback.store";
// playback.service.ts is NOT exported — it's an internal implementation detail
```

```typescript
// Good — goes through the barrel
import { usePlaybackStore } from "@/src/features/playback/playback";

// Bad — reaches past the barrel into internals
import { usePlaybackStore } from "@/src/features/playback/playback.store";
```

This is enforced via ESLint. The barrel defines the contract between features.

### What goes in `shared/` vs a feature

| Question | Answer |
|----------|--------|
| Is it used by 2+ features and has no domain logic? | `shared/` |
| Is it a UI primitive with no business context? | `shared/components/` |
| Is it a pure function (no imports from features)? | `shared/lib/` |
| Is it the DB schema or client? | `shared/db/` |
| Does it belong to a single domain, even if other features use it? | That feature's directory, exported via barrel |

### What lives inside a feature

A feature directory can contain any combination of these files. Use only what you need — not every feature needs all of them.

| File | Purpose | When to include |
|------|---------|-----------------|
| `{feature}.ts` | Barrel — public API | **Always.** Every feature must have one. |
| `{feature}.store.ts` | Zustand store (state + actions) | Feature has app-wide state |
| `{feature}.queries.ts` | Typed DB query functions | Feature reads or writes the database |
| `{feature}.service.ts` | Background service, long-running process | Feature manages I/O, lifecycle, events |
| `{feature}.types.ts` | Shared types and interfaces | Feature defines contracts used by other features |
| `{feature}.use-{name}.ts` | Custom React hook | Feature needs React lifecycle integration |
| `components/` | Feature-specific UI components | Feature has UI |
| `components/{name}.tsx` | Component (kebab-case) | Each component in its own file |
| `components/{feature}.context.tsx` | React Context + provider | Feature needs imperative UI control (action sheets, toasts) |

### Rules

- **One concept per file.** A file named `sync.engine.ts` contains the sync engine. Not the sync engine + helpers + types.
- **Co-locate tests.** `sync.engine.ts` → `sync.engine.test.ts` in the same directory.
- **No cross-feature internal imports.** If you need something from another feature, it must be in that feature's barrel. If it's not exported, that's a signal — either add it to the barrel or rethink the dependency.
- **Screens never contain business logic.** Screens import from feature barrels and wire things together. That's it.

---

## File Naming

**All files use kebab-case.** No PascalCase filenames, no camelCase filenames. The only exception is Expo Router files that require specific casing (`[id].tsx`, `_layout.tsx`).

Why: PascalCase filenames signal a default export of the same name. We use named exports exclusively (except screens), so there is no hard correlation between a filename and its export name. Kebab-case is the universal default.

### Convention

| File type | Pattern | Examples |
|-----------|---------|---------|
| Feature barrel | `{feature}/{feature}.ts` | `playback/playback.ts`, `sync/sync.ts` |
| Feature support file | `{feature}/{feature}.{role}.ts` | `playback/playback.store.ts`, `sync/sync.engine.ts` |
| Feature types | `{feature}/{feature}.types.ts` | `sources/sources.types.ts` |
| Feature hook | `{feature}/{feature}.use-{name}.ts` | `artwork/artwork.use-image-colors.ts` |
| Component | `{name}.tsx` | `album-card.tsx`, `mini-player.tsx`, `empty-state.tsx` |
| Shared utility | `{name}.ts` | `ids.ts`, `format.ts`, `log.ts` |
| Shared barrel | `{area}/{area}.ts` | `db/db.ts`, `theme/theme.ts` |
| Screen | Expo Router conventions | `index.tsx`, `[id].tsx`, `_layout.tsx` |
| Test | `{name}.test.ts(x)` | `sync.engine.test.ts`, `album-card.test.tsx` |

### No `index.ts` files

Barrel files are named after their directory: `playback/playback.ts`, not `playback/index.ts`. This makes it immediately clear what you're looking at in editor tabs, search results, and stack traces — no more wall of `index.ts` tabs.

---

## Imports

### Path alias

Always use `@/` for imports from the project root. Never use relative paths that escape the current feature (no `../../`).

**Within** a feature, use relative imports (they're all co-located):
```typescript
// Inside features/playback/playback.store.ts
import type { PlaybackServiceApi } from "./playback.service";
```

**Between** features or from shared, use `@/`:
```typescript
// Inside features/playback/playback.store.ts
import { useSourcesStore } from "@/src/features/sources/sources";
import { colors } from "@/src/shared/theme/theme";
```

### Import order

Group imports in this order, separated by blank lines:

1. React / React Native
2. Third-party libraries (expo, zustand, drizzle, etc.)
3. `@/src/features/` — other features (via barrel only)
4. `@/src/shared/` — shared infrastructure
5. Relative imports (within the same feature)

```typescript
import { memo, useCallback } from "react";
import { View, Text, Pressable } from "react-native";

import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";

import { usePlaybackStore } from "@/src/features/playback/playback";
import { colors } from "@/src/shared/theme/theme";

import type { AlbumCardProps } from "./library.types";
```

### Named exports everywhere, except screens

```typescript
// src/features/library/album-card.tsx — named export
export const AlbumCard = memo(function AlbumCard({ ... }: AlbumCardProps) { ... });

// src/features/library/library.store.ts — named export
export const useLibraryStore = create<LibraryState>(...);

// app/(tabs)/library/index.tsx — default export (Expo Router requirement)
export default function LibraryScreen() { ... }
```

No default exports. The only exception is screens in `app/`, where Expo Router requires it.

### Type imports

Use `import type` when importing only types. This makes it clear what's a runtime dependency vs a compile-time one.

```typescript
import type { SourceAdapter } from "@/src/features/sources/sources";
```

---

## TypeScript

### Strict mode, always

The project uses `"strict": true`. Do not weaken it with `any`, `@ts-ignore`, or `as` casts unless there is a documented reason in a comment.

### `interface` for object shapes, `type` for everything else

```typescript
// Object shapes → interface
interface TrackRowProps {
  id: string;
  title: string;
  onPress: () => void;
}

// Unions, intersections, computed types → type
type SourceType = "jellyfin" | "plex" | "local";
type AlbumRow = Awaited<ReturnType<typeof getAllAlbums>>[number];
```

### No enums

Use string literal unions instead.

```typescript
// Good
type ImageSize = "small" | "medium" | "large";

// Bad
enum ImageSize { Small = "small", Medium = "medium", Large = "large" }
```

### No `I` prefix on interfaces

```typescript
// Good
interface SourceAdapter { ... }

// Bad
interface ISourceAdapter { ... }
```

### Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Interfaces | PascalCase | `SourceAdapter`, `PlaybackState` |
| Type aliases | PascalCase | `AlbumRow`, `ImageSize` |
| Component props | `<ComponentName>Props` | `AlbumCardProps`, `TrackRowProps` |
| Store state | `<StoreName>State` | `LibraryState`, `PlaybackState` |
| Constants | camelCase | `colors.fermataAccent`, `defaultPageSize` |
| Functions | camelCase | `resolveArtworkUrl`, `stableId` |
| DB tables (Drizzle SQL) | snake_case | `mix_tape_tracks` |
| DB columns (Drizzle SQL) | snake_case | `source_item_id` |
| Drizzle TS table vars | camelCase | `mixTapeTracks` |

---

## Components

### Structure

Every component follows this structure:

```typescript
import { memo, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
// ... other imports

interface MyComponentProps {
  title: string;
  onPress: () => void;
}

export const MyComponent = memo(function MyComponent({
  title,
  onPress,
}: MyComponentProps) {
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <Pressable onPress={handlePress} className="...">
      <Text className="...">{title}</Text>
    </Pressable>
  );
});
```

### Rules

1. **Wrap with `memo()`** — all reusable components. Use a named function inside memo for better debugging (`memo(function AlbumCard(...)` not `memo((...) =>`).
2. **Props interface above the component** — always an `interface`, always named `<ComponentName>Props`.
3. **Destructure props** — never pass as a single `props` object.
4. **Callback props** — name with `on` prefix: `onPress`, `onLongPress`, `onToggleFavourite`, `onValueChange`.
5. **`useCallback` for all handlers** — every function passed as a prop or event handler must be wrapped in `useCallback`.
6. **`Pressable` over `TouchableOpacity`** — always. Pressable handles platform-appropriate feedback.
7. **`numberOfLines={1}`** — on all title and metadata text. Music metadata is long; truncation is expected.
8. **No business logic** — components render and dispatch. Logic lives in stores.

### Component size

If a component exceeds ~150 lines, consider extracting sub-components into the same file (not separate files) unless they're reused elsewhere.

---

## Hooks

### When to write a custom hook

Write a custom hook when you need to:
- Encapsulate a side effect (subscriptions, listeners, timers) used by multiple components
- Wrap a native module with graceful fallback logic
- Compose multiple React hooks into a reusable unit

**Do not** write a hook for:
- Simple state (just use `useState` inline)
- Store access (just use `useMyStore((s) => s.thing)` inline)
- One-off logic in a single component

### Where hooks live

| Scope | Location |
|-------|----------|
| Belongs to a feature domain | `{feature}/{feature}.use-{name}.ts`, exported via barrel |
| Used by a single component | Same file as the component |

### Naming

- Export name always starts with `use`: `useImageColors`, `useDebounce`, `useTrackActions`
- File name: `{feature}.use-{name}.ts` (kebab-case, like all files)

### Structure

```typescript
import { useState, useEffect } from "react";

export function useImageColors(uri: string | null) {
  const [colors, setColors] = useState<ColorResult | null>(null);

  useEffect(() => {
    if (!uri) return;
    // ... subscribe/fetch
    return () => { /* cleanup */ };
  }, [uri]);

  return colors;
}
```

---

## State Management

### The hierarchy: when to use what

| Mechanism | When to use | Examples |
|-----------|------------|---------|
| **Zustand store** | App-wide state that persists across screens, state + async actions, domain logic | Playback queue, library data, connected sources, sync status |
| **React Context** | Imperative UI control that needs to be triggered from deep in the tree | Action sheet show/hide, toast notifications |
| **`useState`** | Local UI state within a single component or screen | Form inputs, modal visibility, selected tab index, loading spinners |
| **`useRef`** | Mutable values that shouldn't trigger re-renders | Interval IDs, layout measurements, previous values |

### When NOT to use each

- **Don't use Zustand** for local UI state (form inputs, "is this dropdown open")
- **Don't use Context** for data that changes frequently (it re-renders all consumers)
- **Don't use `useState`** for state shared across screens (use a store)
- **Don't use `useRef`** for values that should trigger re-renders

### Zustand store rules

1. **One store per feature.** Lives in `{feature}.store.ts`. Not one mega-store, not multiple stores per feature.

2. **Stores are decoupled.** A store never imports another store directly. If a store action needs data from another store, accept it as a function argument.

   ```typescript
   // Good — caller passes adapters
   syncAll: async (adapters: SourceAdapter[]) => { ... }

   // Bad — store reaches into another store
   syncAll: async () => {
     const adapters = useSourcesStore.getState().getAllAdapters();
   }
   ```

3. **Stores call query functions from their own feature.** Stores import from their co-located `{feature}.queries.ts`, never from `shared/db/db.client.ts` or `shared/db/db.schema.ts` directly.

4. **Selective subscriptions.** Always slice state in components to prevent unnecessary re-renders:

   ```typescript
   // Good — only re-renders when albums change
   const albums = useLibraryStore((s) => s.albums);

   // Bad — re-renders on ANY store change
   const { albums } = useLibraryStore();
   ```

5. **Guard against double initialization.** Stores with `initialize()` methods must check `isInitialized` first.

### Context rules

Context is only for imperative UI control. Lives in `{feature}.context.ts`. The pattern:

```typescript
// Define context with a no-op default
const TrackActionsContext = createContext<TrackActionsContextValue>({
  showTrackActions: () => {},
});

// Provider component manages the UI (action sheet, modal, etc.)
export function TrackActionsProvider({ children }: { children: React.ReactNode }) {
  // ... state, handlers
  return (
    <TrackActionsContext.Provider value={{ showTrackActions }}>
      {children}
    </TrackActionsContext.Provider>
  );
}

// Consumer hook
export function useTrackActions() {
  return useContext(TrackActionsContext);
}
```

---

## Styling

### NativeWind (Tailwind) is the only styling system

Use `className` for all styling. No `StyleSheet.create()`. No inline `style` objects except in these cases:

| Exception | Reason | Example |
|-----------|--------|---------|
| React Navigation theme config | NativeWind doesn't apply to nav config objects | `tabBarStyle: { backgroundColor: colors.surface }` |
| Animated/Reanimated values | Dynamic values that change on every frame | `style={{ transform: [{ translateY: animatedValue }] }}` |
| Truly dynamic values from JS | Values computed at runtime that have no Tailwind equivalent | `style={{ height: calculatedHeight }}` |

When you must use `style`, import from `shared/theme` rather than hardcoding hex values:

```typescript
// Acceptable when style is required
import { colors } from "@/src/shared/theme/theme";
<View style={{ backgroundColor: colors.surface }}>

// Bad — hardcoded color
<View style={{ backgroundColor: "#141416" }}>
```

### Color rules

- Always use `fermata-` prefixed Tailwind classes: `bg-fermata-bg`, `text-fermata-text`, `text-fermata-accent`
- Never hardcode hex values in `className` or `style`. Use `colors.*` from theme if you must use `style`.
- The full palette is defined in `tailwind.config.js` and documented in `DESIGN-SYSTEM.md`.

### Common patterns

```tsx
// Surface card
<View className="bg-fermata-surface rounded-xl p-4">

// Primary text
<Text className="text-base font-medium text-fermata-text" numberOfLines={1}>

// Secondary/metadata text
<Text className="text-sm text-fermata-text-secondary" numberOfLines={1}>

// Muted/disabled text
<Text className="text-sm text-fermata-muted">

// Accent (active/playing state)
<Text className="text-base font-medium text-fermata-accent">
```

---

## Screens

### Screens are thin

Screens in `app/` contain only:
- Store subscriptions (sliced)
- Event handler wiring (with `useCallback`)
- Layout and rendering
- Navigation calls

Business logic, data fetching, and mutations live in feature stores and query functions.

```typescript
export default function LibraryScreen() {
  // 1. Store subscriptions — always sliced
  const albums = useLibraryStore((s) => s.albums);
  const refreshAll = useLibraryStore((s) => s.refreshAll);

  // 2. Local UI state
  const [selectedSegment, setSelectedSegment] = useState(0);

  // 3. Effects for initialization
  useEffect(() => {
    refreshAll();
  }, []);

  // 4. Handlers — always useCallback
  const handleAlbumPress = useCallback((id: string) => {
    router.push({ pathname: "/(tabs)/library/album/[id]", params: { id } });
  }, []);

  // 5. Render
  return (
    <SafeAreaView className="flex-1 bg-fermata-bg" edges={["top"]}>
      {/* ... */}
    </SafeAreaView>
  );
}
```

### Screen exports

Screens use `export default function` (Expo Router requirement). Every other file uses named exports.

---

## Database

### Schema is the source of truth

Table definitions live in `shared/db/db.schema.ts`. After any schema change:
1. Edit `db.schema.ts`
2. Run `npx drizzle-kit generate`
3. Rebuild the app

Never write raw SQL. Use Drizzle's query builder.

### All DB access through feature query functions

No file outside `shared/db/` should import the Drizzle client or reference schema tables directly — **except** `{feature}.queries.ts` files. Query files are the only place that touches the DB client and schema, and they live inside their owning feature.

```typescript
// Good — store calls its own feature's query function
import { getAllAlbums } from "./library.queries";
const albums = await getAllAlbums();

// Bad — store imports db client directly
import { db } from "@/src/shared/db/db";
import { albums } from "@/src/shared/db/db.schema";
const result = await db.select().from(albums);
```

### ID strategy

| Entity type | Function | When |
|---|---|---|
| Synced from source (artists, albums, tracks) | `stableId(sourceId, sourceItemId)` | Deterministic — survives re-syncs |
| Local-only (mix tapes, pins) | `generateId()` | Random time-based |

Both live in `shared/lib/ids.ts`.

### Transactions for batch writes

All bulk operations must run inside `db.transaction()`. No exceptions.

### Artwork is a source item ID

Store `artworkSourceItemId` in the database. Resolve to a URL at read time via the artwork feature. Never store resolved URLs.

---

## Error Handling

### By layer

| Layer | Strategy |
|-------|----------|
| **Adapter API clients** | Throw descriptive errors. Include context (URL, status code, what was attempted). |
| **Query functions** | Let errors propagate. Don't catch in queries. |
| **Stores** | Catch in async actions. Set error state for UI. Log via `warn()` or `logError()`. |
| **Screens** | Read error state from stores. Never try/catch in render functions. |
| **Services** | Catch and log. Services must not crash — degrade gracefully. |

### Rules

- **Never silently swallow errors.** `catch (e) {}` is a bug. At minimum, log with `warn()`.
- **User-facing errors** — use `e instanceof Error ? e.message : "Something went wrong"`.
- **Optional native modules** — wrap in try/catch with `require()`. Log unavailability, don't throw.
- **Guard initialization** — stores with `initialize()` must handle failure without blocking the app.

```typescript
// Good — catches, logs, sets state, doesn't block
try {
  await TP.setupPlayer();
} catch (e) {
  logError("Track Player init failed:", e);
  set({ isInitialized: true }); // Don't block on failure
}

// Bad — silent catch
try {
  await TP.setupPlayer();
} catch {}
```

---

## Async Patterns

### Parallel fetches with `Promise.all`

When fetching independent data, use `Promise.all`:

```typescript
const [albums, artists, tracks] = await Promise.all([
  getAllAlbums(),
  getAllArtists(),
  getTracks(),
]);
```

### Fire-and-forget with awareness

When triggering background work, ensure errors are handled:

```typescript
// Good — error is caught in syncOne, not here
syncOne(adapter).then(() => {
  useLibraryStore.getState().refreshAll();
});

// Bad — unhandled rejection
syncOne(adapter); // if this rejects, it's an unhandled promise
```

### Initialization guards

```typescript
initialize: async () => {
  if (get().isInitialized) return; // Prevent double init
  try {
    // ... setup
    set({ isInitialized: true });
  } catch (e) {
    logError("Init failed:", e);
    set({ isInitialized: true }); // Don't block the app
  }
}
```

---

## Logging

Use the logging utilities from `shared/lib/log.ts`. They are no-ops in production.

```typescript
import { log, warn, logError } from "@/src/shared/lib/log";

log("Track Player loaded");           // console.log in dev, no-op in prod
warn("Module not available:", e);      // console.warn in dev
logError("Playback failed:", e);       // console.error in dev
```

Never use `console.log` / `console.warn` / `console.error` directly.

---

## Icons

Use `Ionicons` from `@expo/vector-icons/Ionicons`. No other icon libraries.

- Outline variants for inactive state, filled for active
- `colors.muted` for secondary/decorative icons
- `colors.text` for actionable icons
- `colors.accent` for active/playing state

See `DESIGN-SYSTEM.md` for the full icon reference.

---

## Summary: Decision Tree

```
Where does this code go?

Is it a screen?
  → app/ (export default, thin, delegates to feature stores)

Does it belong to a specific domain (playback, library, sync, sources, downloads, artwork)?
  → src/features/{feature}/
    → Store?       {feature}.store.ts
    → Queries?     {feature}.queries.ts
    → Service?     {feature}.service.ts
    → Hook?        {feature}.use-{name}.ts
    → Context?     {feature}.context.ts
    → Types?       {feature}.types.ts
    → Component?   {name}.tsx (kebab-case)
    → Barrel?      {feature}.ts (always required)

Is it a UI primitive with no business context (EmptyState, SegmentedControl)?
  → src/shared/components/

Is it a pure function with no feature imports?
  → src/shared/lib/

Is it the DB schema or client?
  → src/shared/db/

Is it local UI state (form input, dropdown, tab index)?
  → useState in the component/screen
```
