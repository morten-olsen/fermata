# Fermata 𝄐

*Rediscovering the joy of listening to music.*

There was a time when listening to music was an act — deliberate, personal, joyful. You dropped a needle on vinyl and sat with an album. You pressed play on a Walkman and the world became a soundtrack. You scrolled the click wheel on an iPod and disappeared into your collection. Each generation had a device that made music feel like it mattered.

Then music became a utility. Infinite catalogs, algorithmic playlists, auto-playing queues, social feeds, podcasts wedged between songs. The music is still there, but the *listening* got lost.

Fermata is a music player for people who want it back.

## Philosophy

- **The art of listening** — music deserves your attention, not your background. Fermata is designed for the moments you choose to listen.
- **Calm by design** — no ads, no algorithms, no interruptions. The app waits for you, not the other way around.
- **Your libraries, unified** — connect multiple sources (Jellyfin, and more to come) into a single, beautiful collection that feels like yours.
- **Mix tapes** — the joy of hand-picking tracks and pressing play. Personal, curated, and the quickest way into a great session.
- **Play anywhere** — local playback today, with output routing to external systems tomorrow.

## Architecture

```
┌─────────────────────────────────────┐
│            Fermata App              │
│         (Expo / React Native)       │
├──────────┬──────────┬───────────────┤
│  Source   │  Library │    Output     │
│ Adapters  │  (SQLite)│   Adapters    │
├──────────┤          ├───────────────┤
│ Jellyfin │  Synced  │    Local      │
│ (multi)  │  & merged│  (RN Track    │
│          │          │   Player)     │
│ Local*   │          │               │
│ Plex*    │          │  Music        │
│ Tidal*   │          │  Assistant*   │
└──────────┴──────────┴───────────────┘
                                * = future
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 55 (React Native 0.83) |
| UI | NativeWind v4 (Tailwind CSS for React Native) |
| State | Zustand |
| Local DB | Drizzle ORM + expo-sqlite |
| Audio | React Native Track Player (patched for RN 0.83) |
| Source protocol | Adapter interface + registry (Jellyfin first) |
| Output protocol | Adapter interface (local first) |

## Features

### v1 — Foundation

- [x] Jellyfin source adapter (multi-instance)
- [x] Library sync to local SQLite (incremental, via Drizzle ORM)
- [x] Unified library browsing (albums, artists, tracks)
- [x] Album-focused browsing with prominent artwork
- [x] Playback queue management
- [x] Local audio playback via RN Track Player
- [x] Search across unified library
- [x] Now Playing screen with full album art
- [ ] Mix tapes — delightful playlist building with mosaic artwork
- [ ] Quick play — tap a mix tape to instantly start a session

### v2 — Expand

- [ ] Additional source adapters (local files, Plex)
- [ ] Output routing to Music Assistant
- [ ] Offline playback (downloaded tracks)
- [ ] Sync playlists from sources as mix tapes

### Future

- [ ] Tidal / streaming service adapters
- [ ] DLNA / Chromecast / AirPlay output
- [ ] Crossfade and gapless playback
- [ ] Lyrics display

## Development

```bash
# Install dependencies
npm install          # patch-package runs automatically via postinstall

# Start dev server (Expo Go — no audio playback)
npx expo start

# Build & run with full audio (requires dev build)
npx expo run:ios
npx expo run:android
# Or use EAS cloud builds:
eas build --platform android --profile development

# After schema changes
npx drizzle-kit generate
```

> **Note:** React Native Track Player requires a dev build. In Expo Go, the app works fully except audio playback is silently disabled.

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.
