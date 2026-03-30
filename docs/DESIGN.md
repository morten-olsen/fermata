# Fermata — Design Language

## Principles

1. **The music is the interface** — album art drives the visual experience. UI chrome recedes.
2. **Calm density** — show enough information to be useful, never enough to overwhelm.
3. **Intentional motion** — transitions are smooth and purposeful, never flashy.
4. **Dark by nature** — a dark palette lets album art be the brightest thing on screen.
5. **iPod focus** — one path forward, one thing to do at a time. Depth over breadth.

## Inspiration

### The lineage of listening

Every generation had a device that turned music into something you *did*, not something that happened to you:

**Vinyl** — ritualistic. You chose a record, slid it from the sleeve, placed the needle. The album played front to back because that's how it worked. The constraint was the magic: you committed to an album and listened.

**The Walkman** — personal. For the first time, your music went with you. It was private, intimate — headphones made the world disappear. You carried a few tapes, and that scarcity made each one matter.

**The iPod** — your whole collection, but still focused. The click wheel was a linear journey deeper into your library. Artist → Album → Play. No sidebars, no interruptions. The constraints removed decision fatigue and let you fall into the music.

**Then streaming happened** — and the listening stopped. Infinite choice created paralysis. Algorithms replaced curation. Music became a background utility, wedged between podcasts and social features and "daily mixes" nobody asked for.

### What Fermata takes from each

| Device | Lesson | How Fermata applies it |
|--------|--------|----------------------|
| Vinyl | Commit to an album | Album-focused browsing. Tap an album, it plays front to back. |
| Walkman | Personal curation matters | Mix tapes as a first-class feature. Your picks, your order. |
| iPod | Focused, linear navigation | Drill-down browsing. One path deeper, no distractions. |
| Apple Music | Album art as interface | Large artwork, dynamic color theming, visual-first design. |

Fermata is not nostalgic — it doesn't try to look like an iPod or sound like vinyl. It takes the *emotional qualities* of those experiences and brings them to a modern interface: the commitment of vinyl, the intimacy of the Walkman, the focus of the iPod, and the visual richness of Apple Music.

### What this means in practice

- **Linear drill-down navigation** — the primary flow is a focused path deeper: Library → Artist → Album → Play. Not a web of lateral jumps.
- **One action per moment** — when you're browsing, browse. When you're listening, listen. The Now Playing screen is a destination, not a widget.
- **No interruptions** — nothing pops up, suggests, or redirects attention. The app waits for you.
- **Satisfying physicality** — interactions should feel tactile. Smooth momentum scrolling through album grids. A satisfying snap when the Now Playing screen slides into place. Haptic feedback on key actions.
- **Joy in simplicity** — the pleasure of a small, curated set of choices. Your music, presented with care, nothing else.
- **Mix tapes are a ritual** — building a playlist should feel personal and tactile, like making a mix tape for someone (including yourself). And hitting play on one should be the fastest path into a great listening session.

## Visual Direction

See **[DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)** for the complete design system: color tokens, typography scale, spacing, corner radii, component patterns, layout reference, and anti-patterns.

### Summary

- **Dark palette** — near-black background (`#0A0A0B`), album art is the brightest thing on screen
- **Three surface levels** — bg → surface → elevated. No more.
- **System sans-serif** — no custom fonts. Platform-native at every size.
- **Accent is rare** — soft lavender (`#D4A0FF`) for active/playing states only
- **No borders** — prefer spacing and surface color shifts
- **Album art drives the interface** — large, prominent, with future dynamic color theming

## Mix Tapes

Fermata calls playlists **mix tapes**. The name is intentional — it evokes the personal, curated, hand-picked nature of a great playlist. These aren't algorithmic "Daily Mixes." They're yours.

### Design Goals

- **Quick entry point** — mix tapes live prominently in the library tab, not buried under a sub-menu. Tapping one is the fastest way to start a listening session.
- **Delightful to build** — adding tracks should feel like placing songs on a tape, not managing a database. The interaction should be fast, fluid, and satisfying.
- **Visual identity** — each mix tape gets a mosaic or collage artwork generated from its track artwork, giving it a visual presence alongside albums in your library.
- **Lightweight** — no descriptions, no collaborative features, no sharing. Just a name and an ordered list of tracks.

### Interaction

- **Adding tracks**: Long press a track anywhere → "Add to Mix Tape" → shows your tapes with a quick-create option. Minimal taps.
- **Building mode**: When viewing a mix tape, an edit mode lets you reorder (drag), remove (swipe), and add from a quick search — all without leaving the screen.
- **Quick play**: Tap a mix tape → plays immediately from track 1. No intermediate "detail" screen required (though you can peek at the track list).
- **Shuffle shortcut**: Long press a mix tape → shuffle play.

### Mix Tape Screen

```
┌──────────────────────────┐
│                          │
│   ┌────┬────┐            │
│   │art │art │            │
│   ├────┼────┤  Evening   │
│   │art │art │  Wind Down │
│   └────┴────┘  12 tracks │
│                          │
│  ▶ Play        ⤮ Shuffle │
│                          │
│  1. Artist — Track  3:42 │
│  2. Artist — Track  4:15 │
│  3. Artist — Track  3:58 │
│  ...                     │
│                          │
├──────────────────────────┤
│ advancement ▶ advancement ──advancement────  │ ← mini player
└──────────────────────────┘
```

### Mix Tapes in Library

Mix tapes appear as a horizontal scroll row at the top of the Library tab — always visible, always one tap away. Their mosaic artwork makes them visually distinct from album covers.

```
┌──────────────────────────┐
│  Library                 │
│                          │
│  Mix Tapes               │
│  ┌─────┐ ┌─────┐ ┌────  │
│  │mosaic│ │mosaic│ │mos  │
│  │     │ │     │ │     │
│  │Evening│ │Road  │ │Wor  │
│  └─────┘ └─────┘ └────  │
│                          │
│  Albums                  │
│  ┌─────┐ ┌─────┐ ┌────  │
│  │album│ │album│ │albu  │
│  ...                     │
└──────────────────────────┘
```

## Screens (v1)

| Screen | Purpose |
|--------|---------|
| Library (Albums) | Grid of album artwork — default home view |
| Library (Artists) | Alphabetical artist list with thumbnails |
| Library (Tracks) | Flat track list, sortable |
| Album Detail | Track list with album art backdrop |
| Artist Detail | Artist's albums grid + track list |
| Mix Tape Detail | Track list with mosaic artwork, play/shuffle |
| Now Playing | Full-screen playback with artwork |
| Search | Unified search across library |
| Settings | Source connections, output config, sync |
| Add Source | Server URL, credentials, test connection |
