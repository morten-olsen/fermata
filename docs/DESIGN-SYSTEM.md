# Fermata — Design System

The practical companion to [DESIGN.md](./DESIGN.md). That document describes *why* Fermata looks and feels the way it does. This document describes *how* — the tokens, primitives, patterns, and rules that make it concrete.

---

## Design Philosophy Summary

Fermata's interface exists to get out of the way. The music — its artwork, its metadata, its playback — is the interface. Every visual decision serves one question: *does this help the person listen to music, or does it distract from it?*

Three devices define the emotional target:
- **Vinyl**: commitment to an album, front to back
- **Walkman**: personal curation, intimacy, your picks
- **iPod**: focused navigation, one path deeper

The app should feel like a **quiet room with good speakers** — warm, intentional, nothing competing for attention.

---

## Color

### Palette

Fermata is dark by nature. Album art should be the brightest thing on screen.

| Token | Hex | NativeWind | Purpose |
|-------|-----|------------|---------|
| `bg` | `#0A0A0B` | `bg-fermata-bg` | App background. Near-black. |
| `surface` | `#141416` | `bg-fermata-surface` | Cards, inputs, tab bar. One step above bg. |
| `elevated` | `#1C1C1F` | `bg-fermata-elevated` | Selected states, modals, mini-player. Two steps above bg. |
| `border` | `#2A2A2E` | `border-fermata-border` | Subtle dividers. Used sparingly. |
| `muted` | `#6B6B76` | `text-fermata-muted` | De-emphasized text, disabled icons, placeholders. |
| `text-secondary` | `#9898A3` | `text-fermata-text-secondary` | Supporting text (artist name, metadata, timestamps). |
| `text` | `#E8E8ED` | `text-fermata-text` | Primary text. High contrast against bg. |
| `accent` | `#D4A0FF` | `text-fermata-accent` | Active states, links, currently playing indicator. Soft lavender. |

### Color Rules

1. **Three surfaces, no more.** `bg` → `surface` → `elevated`. If you need a fourth level, the layout is too nested.
2. **No pure white or pure black text.** `text` (`#E8E8ED`) is slightly warm. `bg` (`#0A0A0B`) is not `#000000`.
3. **Accent is rare.** Used for: currently playing track, tappable artist names, the progress bar, active controls. Never for decoration.
4. **Borders are a last resort.** Prefer spacing and surface color shifts to create separation. When borders are necessary, use `border-fermata-border` at 0.5px.
5. **Album art sets the mood.** (Future) The Now Playing screen and mini-player will tint with the dominant color extracted from the current album's artwork.

### Surfaces & Elevation

```
┌──────────────────────────────────────────┐
│  bg (#0A0A0B)                            │  App background
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  surface (#141416)                 │  │  Cards, list items, inputs
│  │                                    │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │  elevated (#1C1C1F)          │  │  │  Selected tabs, mini-player
│  │  └──────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## Typography

System sans-serif throughout. No custom fonts — the system font respects the platform's personality (SF Pro on iOS, Roboto on Android) and renders optimally at all sizes.

### Scale

| Role | Classes | Where used |
|------|---------|------------|
| **Screen title** | `text-3xl font-bold text-fermata-text` | "Library", "Search", "Settings" |
| **Section title** | `text-lg font-semibold text-fermata-text` | "Mix Tapes", "Albums" |
| **Section label** | `text-sm font-medium text-fermata-text-secondary uppercase tracking-wider` | "SOURCES", "OUTPUT", "LIBRARY" |
| **Album/track title** | `text-base font-medium text-fermata-text` | Track rows, search results |
| **Detail title** | `text-2xl font-bold text-fermata-text` | Album detail, Now Playing |
| **Body/metadata** | `text-sm text-fermata-text-secondary` | Artist name, year, track count |
| **Caption** | `text-xs text-fermata-text-secondary` | Artist under track name, timestamps |
| **Muted info** | `text-sm text-fermata-muted` | Track numbers, durations, empty states |

### Typography Rules

1. **Two weights only.** `font-medium` (500) for titles and labels. `font-bold` (700) for screen and detail titles. No light, no thin, no extra-bold.
2. **One line, truncated.** Titles and artist names use `numberOfLines={1}`. Music metadata is inherently long — truncation is expected, not a failure.
3. **No uppercase except section labels.** The small caps `uppercase tracking-wider` treatment is reserved for section headers in settings and search results.

---

## Spacing

Consistent spacing creates rhythm. Fermata uses a base-4 system via Tailwind's default scale.

### Key values

| Tailwind | px | Usage |
|----------|-----|-------|
| `px-4` / `py-4` | 16 | Standard screen padding, card padding |
| `px-6` | 24 | Now Playing screen (more breathing room) |
| `mb-2` | 8 | Between label and content |
| `mb-4` | 16 | Between content blocks |
| `mb-6` | 24 | Between major sections |
| `py-3` | 12 | Vertical padding for list rows and buttons |
| `gap-3` | 12 | Between side-by-side buttons |
| `gap-8` | 32 | Between transport controls |

### Spacing Rules

1. **Screen padding is `px-4` (16px).** All screens. No exceptions.
2. **Now Playing gets extra room.** `px-6` (24px) — the player screen is a destination, not a list.
3. **Generous vertical rhythm.** More space between sections than within them. The eye should naturally scan downward.
4. **100px bottom padding on scrollable lists.** Clears the mini-player and tab bar.

---

## Corner Radii

| Tailwind | Usage |
|----------|-------|
| `rounded-xl` (12px) | Cards, inputs, buttons, album art, surface containers |
| `rounded-2xl` (16px) | Large album art (Now Playing, album detail) |
| `rounded-lg` (8px) | Selected state in segmented control |
| `rounded-full` | Artist thumbnails (circular), play button |

### Radius Rule

**Everything is `rounded-xl` unless it's big or circular.** Large artwork gets `rounded-2xl`. Circles get `rounded-full`. That's it.

---

## Iconography

**Ionicons** from `@expo/vector-icons`. One icon set, used consistently.

### Standard icons

| Icon | Meaning |
|------|---------|
| `library` | Library tab |
| `search` | Search tab |
| `settings-outline` | Settings tab |
| `disc` | Album (fallback when no artwork) |
| `person` | Artist (fallback when no artwork) |
| `musical-notes` | Track, mix tape, generic music |
| `play` / `pause` | Playback toggle |
| `play-skip-back` / `play-skip-forward` | Previous / next track |
| `shuffle` | Shuffle play |
| `volume-high` | Currently playing indicator (in track rows) |
| `volume-high-outline` | Output/volume control |
| `chevron-back` | Navigation back |
| `chevron-forward` | Disclosure indicator (settings rows) |
| `chevron-down` | Collapse (Now Playing screen) |
| `server-outline` / `server` | Source server |
| `sync-outline` | Sync |
| `add-circle-outline` | Add source |
| `trash-outline` | Delete |
| `list` | Queue |
| `close-circle` | Clear search input |
| `alert-circle` | Error |

### Icon Rules

1. **Outline variants for inactive, filled for active.** Exception: transport controls are always filled.
2. **Muted color (`colors.muted`) for secondary icons.** Disclosure chevrons, settings icons, empty state icons.
3. **`colors.text` for actionable icons.** Transport controls, back buttons.
4. **`colors.accent` for active state.** Currently playing indicator, tappable links.
5. **Consistent sizes.** Tab bar: default (`size` prop). List rows: 18-22. Transport: 28-32. Empty states: 48.

---

## Component Patterns

### Cards (AlbumCard, MixTapeCard)

```
┌─────────────────┐
│                  │
│   [artwork]      │  aspect-square, rounded-xl, bg-fermata-surface
│                  │
├─────────────────┤
│ Title            │  text-sm font-medium text-fermata-text
│ Subtitle         │  text-xs text-fermata-text-secondary
└─────────────────┘
```

- Artwork fills the card. Fallback: centered Ionicons icon on `bg-fermata-surface`.
- Text is below, not overlaid. Two lines max: title + metadata.
- `mb-4` between cards in a grid.
- Touch target is the entire card (`Pressable` wraps everything).

### List Rows (TrackRow, ArtistRow, SettingsRow)

```
┌──┬──────────────────────────┬────┐
│##│ Title                    │3:42│  py-3 px-1
│  │ Subtitle                 │    │
└──┴──────────────────────────┴────┘
```

- Horizontal layout: leading element (number/icon/avatar) → flex-1 text → trailing element (duration/chevron).
- Consistent `py-3` vertical padding creates even row height.
- Active/playing state: title turns `text-fermata-accent`, leading icon becomes volume indicator.
- `Pressable` wraps the full row. `onLongPress` for contextual actions.

### Action Buttons (Play, Shuffle)

```
┌─────────────────┐ ┌─────────────────┐
│  ▶  Play        │ │  ⤮  Shuffle     │
└─────────────────┘ └─────────────────┘
```

- Side by side in a `flex-row gap-3`, each `flex-1`.
- Primary action (Play): `bg-fermata-text` with `text-fermata-bg`. White on dark.
- Secondary action (Shuffle): `bg-fermata-elevated` with `text-fermata-text`. Subtle.
- Both: `py-3 rounded-xl`, icon + text centered with `ml-2` gap.

### Empty States

- Centered vertically in available space.
- Large icon (48px, `colors.border` — very subtle).
- Title in `text-fermata-muted`.
- Optional subtitle in `text-fermata-text-secondary`, narrower (`px-8`).
- No call-to-action buttons — navigation handles next steps.

### Inputs (TextInput, Search)

- `bg-fermata-surface rounded-xl px-4 py-3 text-base text-fermata-text`
- Placeholder color: `colors.muted` (`#6B6B76`)
- Search: leading search icon, trailing clear button (appears when text present).
- No borders. The surface color shift provides enough definition.

### Segmented Control

- Container: `bg-fermata-surface rounded-xl p-1`
- Each segment: `flex-1 py-2 rounded-lg items-center`
- Selected: `bg-fermata-elevated text-fermata-text`
- Unselected: transparent, `text-fermata-muted`

---

## Navigation Patterns

### Tab Bar

Three tabs: Library, Search, Settings. The minimum.

- `bg-fermata-surface`, subtle top border (`0.5px border-fermata-border`)
- 85px height (clears safe area on notched devices)
- Active: `text-fermata-text`. Inactive: `text-fermata-muted`.

### Drill-Down (Stack Navigation)

The iPod pattern: deeper, not wider.

```
Library → Artist → Album → [plays]
Library → Album → [plays]
Library → Mix Tape → [plays]
```

- Back button: `chevron-back` in top-left, `colors.text`, no text label.
- No navigation headers — screen titles are inline content.
- Transitions: default platform push animation.

### Modals

Two modal types:

1. **Now Playing**: slides up from bottom, full screen. Drag handle at top. Dismiss via chevron-down or swipe.
2. **Add Source**: presented as modal within settings stack. Cancel/done pattern.

### Mini Player

- Positioned absolutely above the tab bar (`bottom: 85`).
- Only visible when a track is playing (`currentTrack !== null`).
- Tapping anywhere navigates to full Now Playing.
- Shows: mini artwork (40x40), title, artist, play/pause, skip.
- Thin progress bar at the bottom.

---

## Interaction & Feedback

### Haptics

- **Play/Pause toggle**: `ImpactFeedbackStyle.Light` — a subtle click confirming the action.
- Future: haptic on long-press, on completing a mix tape add.

### Transitions

- Image loading: `transition={200}` on `expo-image` for a gentle fade-in.
- Large artwork (Now Playing, album detail): `transition={300}` — slightly slower, more deliberate.
- Now Playing modal: `slide_from_bottom` animation.

### Touch States

- `Pressable` everywhere — never `TouchableOpacity`. Pressable handles platform-appropriate feedback.
- No custom opacity animations on press. Let the platform handle it.

### Loading States

- Sync: `ActivityIndicator` inline with the sync button label. No modal blocking.
- Connecting: button label changes to "Connecting..." with spinner.
- Library loading: `isLoading` state, no skeleton screens (the data is local, loads instantly).

---

## Layout Reference

### Library Screen

```
┌──────────────────────────────────┐
│  Library                    3xl  │ ← screen title
│                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌──   │ ← mix tapes (horizontal scroll)
│  │     │ │     │ │     │ │     │
│  │mixtape│ │mixtape│ │  +  │       │
│  └─────┘ └─────┘ └─────┘ └──   │
│                                  │
│  [Albums] [Artists] [Tracks]     │ ← segmented control
│                                  │
│  ┌─────┐ ┌─────┐                │ ← album grid (2 columns)
│  │album│ │album│                │
│  │     │ │     │                │
│  │Title│ │Title│                │
│  │Artst│ │Artst│                │
│  ├─────┤ ├─────┤                │
│  │album│ │album│                │
│  ...                             │
├──────────────────────────────────┤
│  ▶ Track · Artist    ▶ ▷▷       │ ← mini player (when playing)
├──────────────────────────────────┤
│  📚        🔍        ⚙️          │ ← tab bar
└──────────────────────────────────┘
```

### Now Playing Screen

```
┌──────────────────────────────────┐
│          ━━━━━                   │ ← drag handle
│  ˅                               │ ← collapse
│                                  │
│        ┌────────────────┐        │
│        │                │        │
│        │                │        │
│        │   Album Art    │        │ ← 320x320, rounded-2xl
│        │                │        │
│        │                │        │
│        └────────────────┘        │
│                                  │
│  Track Title              2xl    │
│  Artist — Album           base   │
│                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ ← progress bar (accent color)
│  0:00                      3:42  │
│                                  │
│       ⏮      ▶ (72px)     ⏭     │ ← transport controls
│                                  │
│  🔊                          ≡   │ ← output, queue
└──────────────────────────────────┘
```

---

## Anti-Patterns

Things Fermata explicitly avoids:

| Don't | Why |
|-------|-----|
| Gradient overlays on album art | Obscures the art. Let it breathe. |
| Blur backgrounds behind text | Noisy, distracting. Use solid surfaces. |
| Animated backgrounds or particles | This is a music player, not a visualizer. |
| Badge counts or notification dots | Nothing should demand attention uninvited. |
| Skeleton loading screens | Library data is local — loads in <50ms. Skeletons imply slowness. |
| Pull-to-refresh | Sync is explicit (settings). Browsing is reading local data. |
| Floating action buttons | Not part of the visual language. Actions are contextual. |
| Borders around album art | The art has its own edges. Extra borders add visual noise. |
| Colored backgrounds per screen | The dark bg is constant. Color comes from album art, not chrome. |
| Onboarding carousels or tooltips | The app is simple enough to not need them. |
