# Playback Players & Output Adapters — Design Document

## Overview

Fermata plays audio through different backends — the local device (via React Native Track Player) or external speakers (via Home Assistant WebSocket). The architecture separates **what to play** from **how to play it**:

```
PlaybackService (source of truth)
  │  owns: queue, currentIndex, positionMs, volume, status
  │
  ├── LocalPlaybackPlayer   → RNTP → phone speaker / headphones
  └── HAPlaybackPlayer      → HA WebSocket → media_player entity → network speaker
```

The PlaybackService owns all state. Players are dumb I/O devices that receive a full state snapshot via `reconcile()`.

---

## Architecture

### Where things live

```
src/services/playback/
  playback.service.ts         # Single source of truth for all playback state
  playback.player.ts          # PlaybackPlayer abstract class
  playback.types.ts           # ReconcilePayload, QueueItem, TrackMetadata, events
  playback.schemas.ts         # Zod schemas for DB queue persistence
  playback.bridge.ts          # Module-level ref for RNTP background service
  players/
    local.player.ts           # Wraps RNTP — supports gapless via native queue
    ha.player.ts              # Wraps HA WebSocket — single-track playback

src/services/outputs/
  outputs.service.ts          # Output CRUD, speaker management, player creation
  outputs.types.ts            # OutputConfig, Speaker, ActiveTarget
  home-assistant/
    home-assistant.api.ts     # HA WebSocket wrapper (stateless utility)
    home-assistant.types.ts   # HA-specific types

src/hooks/playback/playback.ts  # usePlaybackState, usePlayTrack, useSkipNext, etc.
src/hooks/outputs/outputs.ts    # useOutputSpeakers, useSetActiveSpeaker, etc.

src/components/playback/        # PlayerOverlay, NowPlayingUI, QueueSheet, EqualizerBars
src/components/outputs/         # OutputPicker
```

### Who owns what

| Concern | Owner | Rationale |
|---------|-------|-----------|
| Queue, position, volume, status | `PlaybackService` | Playback state is output-independent |
| Stream URL resolution | `PlaybackService` | Uses SourcesService + DownloadService via DI |
| Transport (reconcile, pause, seek) | `PlaybackPlayer` | Each player talks to different hardware |
| Progress tracking | `PlaybackService` | Reacts to player events, writes to DB |
| Output configs (CRUD) | `OutputsService` | Persists HA connection configs |
| Speaker discovery | `OutputsService` | Manages HA connections, entity subscriptions |
| Player creation & swapping | `OutputsService` | Creates players, calls `PlaybackService.setPlayer()` |
| Connection lifecycle | `OutputsService` | Battery-conscious connect/disconnect |
| Lock screen controls | RNTP background service | Dispatches to PlaybackService via bridge |

---

## The PlaybackPlayer Interface

The core abstraction — a dumb I/O device that receives full state snapshots:

```typescript
type PlaybackPlayerEvents = {
  progress: (positionMs: number, durationMs: number) => void;
  trackEnded: () => void;
  error: (error: Error) => void;
  stateChanged: (isPlaying: boolean) => void;
};

abstract class PlaybackPlayer extends EventEmitter<PlaybackPlayerEvents> {
  abstract reconcile(payload: ReconcilePayload): Promise<void>;
  abstract pause(): Promise<void>;
  abstract resume(): Promise<void>;
  abstract seek(positionMs: number): Promise<void>;
  abstract setVolume(volume: number): Promise<void>;
  abstract stop(): Promise<void>;
  abstract dispose(): Promise<void>;
}
```

### The ReconcilePayload

Every state push to the player goes through the same path:

```typescript
type ReconcilePayload = {
  queue: ResolvedQueueItem[];   // stream URLs + metadata for all queue items
  currentIndex: number;         // which item to play
  positionMs: number;           // seek position (including chapter offset)
  volume: number;               // 0–1
};
```

"Play this album starting at track 3", "skip to next track", and "transfer to a new speaker" are all the same operation: build a payload, call `reconcile()`.

### How players handle reconcile differently

**LocalPlaybackPlayer (RNTP)**:
- Loads the **full queue** for gapless playback: `TP.reset()` → `TP.add(allTracks)` → `TP.skip(currentIndex)` → `TP.play()`
- Schedules seek to `positionMs` after buffering (300ms delay + retry)

**HAPlaybackPlayer**:
- **Ignores the queue array** — HA speakers don't support native queueing
- Plays only `queue[currentIndex]` via `playMedia()`
- Schedules seek after media load (3s delay + retry)

The service doesn't branch on player capabilities. It always sends the full snapshot. The player takes what it can use.

---

## Transfer Playback (Reconciliation)

Switching speakers is just: stop old player → set new player → reconcile with same state.

```
1. User taps "Kitchen Speaker" in output picker
2. OutputsService.setActiveSpeaker("ha-1", "media_player.kitchen")
3. OutputsService creates HAPlaybackPlayer(connection, entityId)
4. OutputsService shows lock screen notification via LocalPlaybackPlayer
5. PlaybackService.setPlayer(haPlayer)
   → unsubscribes from old player events
   → subscribes to new player events
   → calls #reconcile() → resolves stream URLs → haPlayer.reconcile(payload)
6. HA speaker starts playing at the same position
```

Switching back to local is the same: `PlaybackService.setPlayer(localPlayer)` → reconcile.

---

## Progress Tracking

Integrated into PlaybackService (not a separate service):

- **On player `stateChanged(false)`** (pause): save progress for current track
- **On player `trackEnded`**: save progress, advance to next track
- **Every 30s while playing**: periodic save (with 5s change threshold)
- **On track switch**: save progress for outgoing track before loading new one

Progress writes go to the `playbackProgress` table with `needsSync = 1` for bidirectional sync.

Completion detection: position within 30s of track end → mark `isCompleted`. Completed tracks resume from the beginning.

---

## OutputsService

Manages output configurations and speaker routing:

- **Output CRUD**: persists HA connection configs in `outputConfigs` table
- **HA connections**: connects on app launch, discovers `media_player` entities
- **Speaker selection**: creates appropriate `PlaybackPlayer` and swaps it on PlaybackService
- **Battery lifecycle**: disconnects HA connections when app is backgrounded and idle

### Battery-conscious connection policy

| App state | Playback | Connection policy |
|-----------|----------|-------------------|
| Foreground | Any | Keep connected |
| Background | Playing | Keep connected |
| Background | Paused | 30s grace period, then disconnect |
| Background | Stopped | Disconnect immediately |

Auto-reconnects with exponential backoff (0 → 1s → 2s → 4s → 8s → 16s → 30s, max 5 attempts).

---

## Lock Screen Controls

RNTP provides the lock screen notification and handles remote events (play, pause, skip, seek) on both iOS and Android.

When a network player is active, RNTP acts in **notification-only mode** — it doesn't stream audio, just displays Now Playing metadata. The `LocalPlaybackPlayer.showNotificationForRemotePlayback()` method loads a silent placeholder track with the current metadata.

Remote events flow through the RNTP background service → PlaybackService bridge → `togglePlayPause()`, `skipNext()`, etc. → active player.

---

## Home Assistant Integration

### HA as a source of speakers

One HA connection (WebSocket) exposes many `media_player` entities. OutputsService:

1. **Connects** via `home-assistant-js-websocket` using URL + long-lived access token
2. **Subscribes** to all entity state changes via `subscribeEntities`
3. **Exposes** `media_player.*` entities as speakers in the output picker
4. **Creates** a `HAPlaybackPlayer(connection, entityId)` when the user picks a speaker

Switching between speakers on the same HA instance is instant — no reconnection needed.

### HA position tracking

HA only updates `media_position` on state changes. The player interpolates:

```
current_position = media_position + (now - media_position_updated_at)
```

A 1-second polling interval keeps the progress bar smooth.

---

## Open Questions

1. **Speaker groups** — deferred. A group adapter would fan out commands to multiple entities.
2. **Gapless on network outputs** — most HA speakers don't support it. Brief gaps between tracks are expected.
3. **Position drift** — HA interpolation may drift over long sessions. Could re-read entity state periodically.
