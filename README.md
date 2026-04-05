# Fermata 𝄐

*Rediscovering the joy of listening.*

There was a time when listening was an act — deliberate, personal, joyful. You dropped a needle on vinyl and sat with an album. You pressed play on a Walkman and the world became a soundtrack. You scrolled the click wheel on an iPod and disappeared into your collection. You tuned into a voice on the radio and felt someone speaking just to you. You pulled a book from the shelf and picked up right where you left off.

Then media became a utility. Infinite catalogs, algorithmic playlists, auto-playing queues. The content is still there, but the *listening* got lost.

Fermata is a media player for people who want it back.

## What it does

**Music.** Connect your Jellyfin server and browse your entire library — albums, artists, tracks — with artwork front and center. Build mix tapes (playlists), favourite tracks, and play albums front to back with gapless transitions. The Now Playing screen wraps your album art in a vinyl disc that spins while you listen, bathed in colors pulled from the cover.

**Podcasts.** Connect Audiobookshelf and browse your shows. Track which episodes you've played, pick up where you left off, and sync progress back to your server automatically.

**Audiobooks.** Same Audiobookshelf connection. Navigate by chapter, resume exactly where you stopped, and watch your progress sync across devices.

**One app, all your listening.** Everything lives in a single, calm interface. No context switching between apps.

## How it works

Fermata connects to media servers you already run. It syncs your libraries to the device so browsing is instant and works offline. Your data stays yours — there are no accounts, no cloud services, no tracking.

### Supported sources

- **Jellyfin** — music libraries (albums, artists, tracks, playlists)
- **Audiobookshelf** — podcasts and audiobooks (with bidirectional progress sync)

### Play anywhere

Listen on the device, or route playback to speakers around your home via Home Assistant — like Spotify Connect, but for your own library.

### Runs everywhere

iOS, Android, and web. Responsive from phone to tablet to desktop.

## Philosophy

- **Calm by design** — no ads, no algorithms, no interruptions. The app waits for you, not the other way around.
- **Album art is the interface** — artwork drives the visual experience. UI chrome recedes.
- **Your library, your rules** — Fermata doesn't curate for you. It presents what you have and gets out of the way.
- **Offline-first** — everything syncs locally. Browsing and playback work without a connection.
- **Open** — GPL-3.0. Free to use, inspect, modify, and share.

## For developers

Fermata is built with Expo (React Native), NativeWind, expo-sqlite, and expo-audio. The codebase is organized by domain feature with a composable design system documented in Storybook.

See [CLAUDE.md](CLAUDE.md) for architecture, conventions, and the full dependency graph.

```bash
npm install              # Install dependencies
npx expo start           # Dev server
npx expo run:ios         # iOS dev build
npx expo run:android     # Android dev build
npx expo start --web     # Web
npm run storybook        # Design system on port 6006
```

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.
