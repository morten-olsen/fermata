# Output Adapters — Design Document

## Overview

Output adapters let Fermata play music through external speakers and devices — the same idea as Spotify Connect. The user picks a target ("play on Kitchen Speaker") and Fermata delegates playback control to that device while maintaining full transport control from the app and lock screen.

```
Queue (playback store)
  │
  ├── LocalOutputAdapter    → RNTP → phone speaker / headphones
  └── HAOutputAdapter       → HA WebSocket → media_player entity → network speaker
```

The playback store owns the queue and track ordering. The output adapter owns the transport: play, pause, seek, volume. This separation means switching outputs mid-session preserves the queue — only the audio destination changes.

---

## Architecture

### Where output adapters live

Output adapters are a new feature: `src/features/outputs/`. This keeps them separate from `playback` (which owns the queue) and from `sources` (which own metadata sync and stream URLs).

```
src/features/outputs/
  outputs.ts                    # Barrel
  outputs.store.ts              # Active output, available outputs, connection state
  outputs.types.ts              # OutputAdapter interface (moved from playback.types.ts)
  outputs.registry.ts           # Factory: type → constructor
  outputs.queries.ts            # Persisted output configs (DB)
  local/
    local.ts                    # Barrel
    local.adapter.ts            # Wraps RNTP (current playback logic extracted)
  home-assistant/
    home-assistant.ts           # Barrel
    home-assistant.adapter.ts   # OutputAdapter implementation
    home-assistant.api.ts       # HA WebSocket wrapper
    home-assistant.types.ts     # HA-specific types
```

### Dependency graph update

```
sources     ← (leaf)
outputs     ← sources                     # needs source capabilities for compatibility
artwork     ← sources
library     ← sources, artwork, playback, downloads
playback    ← sources, library, downloads, artwork, outputs
sync        ← sources, library, artwork
downloads   ← sources, library
```

### Who owns what

| Concern | Owner | Rationale |
|---------|-------|-----------|
| Queue (track order, current index) | `playback.store` | Queue is output-independent — switching speakers doesn't change what's playing |
| Transport (play, pause, seek, volume) | `OutputAdapter` | Each output talks to different hardware |
| Track resolution (stream URL) | `playback.store` via source adapter | The store already resolves URLs via `toRNTrack()` |
| Connection lifecycle | `outputs.store` | Manages connect/disconnect, monitors app state |
| Lock screen controls | `playback.service` + active adapter | Service dispatches to whichever adapter is active |
| Output persistence | `outputs.queries` | Remember configured outputs across sessions |

---

## The OutputAdapter Interface

The existing interface in `playback.types.ts` is close but needs expansion for queue transfer, connection lifecycle, and capability negotiation.

```typescript
interface OutputAdapterCapabilities {
  /** Adapter can accept a URL to stream from (e.g. HA media_player.play_media) */
  canStreamFromUrl: boolean;
  /** Adapter can play from a local file path */
  canPlayLocalFiles: boolean;
  /** Adapter supports seeking */
  canSeek: boolean;
  /** Adapter supports volume control */
  canSetVolume: boolean;
  /** Adapter supports reporting playback position */
  canReportPosition: boolean;
  /** Adapter supports loading a queue of tracks (not just one at a time) */
  canQueue: boolean;
}

type OutputConnectionState = "disconnected" | "connecting" | "connected" | "error";

interface OutputAdapter {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly capabilities: OutputAdapterCapabilities;

  // ── Connection lifecycle ──────────────────────────────────
  /** Establish connection to the output device. May fail for network outputs. */
  connect(): Promise<void>;
  /** Gracefully close the connection. Idempotent. */
  disconnect(): Promise<void>;
  /** Current connection state */
  getConnectionState(): OutputConnectionState;
  /** Subscribe to connection state changes */
  onConnectionStateChange(cb: (state: OutputConnectionState) => void): Unsubscribe;

  // ── Transport ─────────────────────────────────────────────
  /** Start playing a track. streamUrl may be a remote URL or local file URI. */
  play(streamUrl: string, track: OutputTrackMetadata): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;

  // ── State observation ─────────────────────────────────────
  getPlaybackState(): PlaybackState;
  onPlaybackStateChange(cb: (state: PlaybackState) => void): Unsubscribe;
}

/** Metadata passed to the adapter for display on the target device */
interface OutputTrackMetadata {
  trackId: string;
  title: string;
  artistName: string;
  albumTitle: string;
  artworkUrl?: string;
  durationMs: number;
}
```

### Why the store still owns the queue

The adapter receives one track at a time via `play(streamUrl, metadata)`. The playback store handles skip-next/skip-previous by resolving the next track and calling `play()` again.

This is simpler and more universal than pushing a full queue to every adapter type. Most network speakers (HA, Sonos, Chromecast) operate on a "play this URL" model anyway. The `canQueue` capability flag is reserved for future adapters that natively support queues (like RNTP/local), where we can batch-load for gapless playback.

---

## Source Capabilities

Not all sources can serve all outputs. A Jellyfin track has a stream URL that any network speaker can fetch — but a locally downloaded file on the phone can't be played by a Home Assistant speaker (no HTTP server on the phone). Sources need to declare what they can provide.

### Source streaming traits

Add to `SourceAdapter`:

```typescript
interface SourceStreamingCapabilities {
  /** Source provides HTTP(S) URLs accessible from the local network */
  hasNetworkStreamUrl: boolean;
  /** Source provides URLs accessible from the internet (not just LAN) */
  hasPublicStreamUrl: boolean;
}

// Added to SourceAdapter interface:
interface SourceAdapter {
  // ... existing methods ...
  getStreamingCapabilities(): SourceStreamingCapabilities;
}
```

### Compatibility matrix

| Track origin | Local adapter | HA adapter | Why |
|---|---|---|---|
| Jellyfin stream URL | Yes | Yes | URL is network-accessible; HA can fetch it |
| Downloaded local file | Yes | No | File is on-device; HA can't reach it |
| Future: local-only source | Yes | No | No network URL exists |

### Resolution logic

When the playback store resolves a track for the active output, it checks compatibility:

```typescript
function canPlayOnOutput(
  track: QueueTrack,
  output: OutputAdapter,
  source: SourceAdapter | undefined,
  isDownloaded: boolean
): boolean {
  // Local adapter can play anything
  if (output.capabilities.canPlayLocalFiles) return true;

  // Network output needs a streamable URL
  if (output.capabilities.canStreamFromUrl) {
    if (source?.getStreamingCapabilities().hasNetworkStreamUrl) return true;
  }

  return false;
}
```

Tracks that can't play on the active output are **skipped with a warning**, not silently dropped. The UI should indicate which tracks in the queue are unplayable on the current output (e.g., a subtle badge or dimmed state).

---

## Connection Lifecycle & Battery

Network output adapters maintain a WebSocket or TCP connection. This is fine while music is playing, but wasteful when the app is backgrounded and idle.

### State machine

```
                          ┌──────────────┐
                     ┌───▶│ disconnected │◀──── app idle timeout
                     │    └──────┬───────┘      or user switches output
                     │           │
                     │     user selects output
                     │     or playback starts
                     │           │
                     │    ┌──────▼───────┐
                     │    │  connecting  │
                     │    └──────┬───────┘
                     │           │
                     │      success / failure
                     │           │
              error  │    ┌──────▼───────┐
              ───────┘    │  connected   │──── transport commands flow
                          └──────┬───────┘
                                 │
                           connection lost
                                 │
                          ┌──────▼───────┐
                          │    error     │──── auto-reconnect (with backoff)
                          └──────────────┘
```

### Battery-conscious connection policy

The outputs store listens to two signals:

1. **App state** (via React Native `AppState`) — foreground vs background
2. **Playback state** — playing vs idle

| App state | Playback | Connection policy |
|-----------|----------|-------------------|
| Foreground | Any | Keep connected (user is interacting) |
| Background | Playing | Keep connected (music is active) |
| Background | Paused | Grace period (30s), then disconnect |
| Background | Stopped | Disconnect immediately |

When the user resumes and the adapter is disconnected, it reconnects automatically. This is transparent — the user doesn't need to manually reconnect.

### Reconnection with backoff

Network adapters implement exponential backoff on connection failure:

- Attempt 1: immediate
- Attempt 2: 1s
- Attempt 3: 2s
- Attempt 4: 4s
- Max: 30s between attempts
- Stop after 5 failures; set state to `error`; surface to UI

---

## Lock Screen & Notification Controls

Lock screen controls are critical for output adapters — the user should be able to pause their kitchen speaker from the lock screen without opening the app.

### How it works today

`playback.service.ts` registers a RNTP `PlaybackService` that handles remote events (play, pause, next, previous, seek). These events come from the iOS lock screen / Android notification and are forwarded to RNTP directly.

### How it works with output adapters

The playback service dispatches to the **active output adapter** instead of directly to RNTP:

```
Lock screen tap "pause"
  → RNTP remote event (PlaybackService)
  → playback store action (togglePlayPause)
  → active output adapter (pause())
  → if HA: send WebSocket command to HA
```

**Key insight**: RNTP must still be initialized even when using a network output, because RNTP is what provides the lock screen notification and handles remote events on iOS/Android. But when a network adapter is active, RNTP acts as a "notification-only" player — it doesn't stream audio, it just displays the Now Playing info and captures remote events.

This means the `LocalOutputAdapter` uses RNTP for both audio AND notifications, while network adapters use RNTP for notifications only and delegate audio to the remote device.

### RNTP in notification-only mode

When a network adapter is active:
1. RNTP is set up normally (for lock screen metadata + remote events)
2. A silent/no-op track is loaded so RNTP shows the notification
3. Track metadata (title, artist, artwork) is updated via `TP.updateNowPlayingMetadata()`
4. Audio output is muted/not loaded — the network adapter handles actual audio
5. Remote events (play/pause/skip) are intercepted and forwarded to the active adapter

This avoids re-implementing iOS `MPNowPlayingInfoCenter` / Android `MediaSession` from scratch.

---

## The Outputs Store

The store treats HA instances as **sources of speakers**, not as individual outputs. One HA connection exposes many `media_player` entities. The user picks a specific speaker from the output picker — the store tracks both the output ID (which HA instance) and the entity ID (which speaker).

```typescript
/** Identifies an active speaker: which output instance + which entity */
interface ActiveTarget {
  outputId: string;  // which HA instance
  entityId: string;  // which media_player entity
}

interface OutputsStoreState {
  /** All configured outputs (persisted HA instances) */
  outputs: OutputEntry[];
  /** Currently active target. null = local device */
  activeTarget: ActiveTarget | null;
  /** Connection state of the active output */
  connectionState: OutputConnectionState;
  /** Flattened list of discovered speakers from all HA instances */
  availableSpeakers: Array<HAEntity & { outputId: string; outputName: string }>;

  // Actions
  setActiveSpeaker: (outputId: string, entityId: string) => Promise<void>;
  setLocalActive: () => Promise<void>;
  getActiveAdapter: () => OutputAdapter;
}
```

HA instances connect on app launch (non-blocking) to discover their `media_player` entities. The `availableSpeakers` list is rebuilt whenever entities change. The output picker shows this flat list of speakers, grouped implicitly by HA instance name.

### Output registry

Mirrors the source adapter registry pattern:

```typescript
// outputs.registry.ts
const registry = new Map<string, OutputAdapterConstructor>();

export function registerOutputAdapter(type: string, ctor: OutputAdapterConstructor) {
  registry.set(type, ctor);
}

export function createOutputAdapter(type: string, id: string, name: string): OutputAdapter {
  const Ctor = registry.get(type);
  if (!Ctor) throw new Error(`Unknown output adapter type: ${type}`);
  return new Ctor(id, name);
}
```

### Wiring to the playback store

Same resolver injection pattern used by sources:

```typescript
// In app/_layout.tsx
setOutputResolver(() => useOutputsStore.getState().getActiveAdapter());
```

The playback store calls the active adapter for all transport operations instead of calling RNTP directly.

---

## Database Schema

New table for persisted output configurations:

```typescript
// In db.schema.ts
export const outputConfigs = sqliteTable("output_configs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),                    // "local" | "home-assistant"
  name: text("name").notNull(),                    // "Kitchen Speaker"
  config: text("config").notNull().default("{}"),  // JSON blob, type-specific
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

The `config` column stores a JSON object with type-specific fields. For Home Assistant: `{ url, accessToken, entityId }`. This avoids a wide table with nullable columns for every adapter type.

---

## Home Assistant Adapter — Reference Implementation

### Dependencies

- [`home-assistant-js-websocket`](https://github.com/home-assistant/home-assistant-js-websocket) — official HA WebSocket client. Handles authentication, automatic reconnection, and command/subscription APIs.

### HA media_player concepts

HA exposes speakers as `media_player` entities. Key services:

| Service | What it does |
|---------|--------------|
| `media_player.play_media` | Play a URL on the speaker |
| `media_player.media_pause` | Pause |
| `media_player.media_play` | Resume |
| `media_player.media_stop` | Stop |
| `media_player.media_seek` | Seek to position |
| `media_player.volume_set` | Set volume (0–1) |

State is observed via HA's state subscription system — the WebSocket pushes state changes for the entity.

### HA as a source of speakers

A single `HAOutputAdapter` instance represents one HA installation — not one speaker. The adapter:

1. **Connects** via WebSocket using URL + long-lived access token
2. **Discovers** all `media_player` entities via `subscribeEntities`
3. **Exposes** them via `getEntities()` — the output picker shows these as individual speakers
4. **Targets** one entity at a time via `setActiveEntity(entityId)` — called by the store when the user picks a speaker
5. **Routes** all transport commands (`play`, `pause`, `seek`, etc.) to the active entity

This means:
- **One WebSocket per HA instance**, not per speaker — efficient
- **Entity list updates live** — if a speaker goes offline or a new one appears, the picker reflects it immediately
- **Switching speakers is instant** — no reconnection needed, just change which entity receives commands
- **DB stores connection config only** — `{ url, accessToken }`, no `entityId`. The entity selection is runtime state in the output picker.

### HA position tracking

HA's `media_position` attribute is only updated on state changes (play/pause/seek), not continuously. The adapter interpolates between updates:

```
current_position = media_position + (now - media_position_updated_at)
```

A 1-second polling interval re-notifies playback state listeners to keep the progress bar smooth.

### Authentication

HA uses long-lived access tokens for WebSocket auth. The user creates one in their HA profile. Fermata stores this in the `output_configs` table (same security posture as source access tokens — both are TODO for `expo-secure-store` migration).

---

## Playback Store Refactor

The playback store currently calls RNTP directly. With output adapters, it delegates to the active adapter. The refactor is incremental:

### Phase 1: Extract LocalOutputAdapter

Move all RNTP calls from `playback.store.ts` into `local/local.adapter.ts`. The store calls the adapter. Behavior is identical — this is a pure refactor with no user-visible change.

### Phase 2: Wire the outputs store

The playback store gets an output resolver (same injection pattern as the source adapter resolver). Transport actions delegate to the resolved adapter:

```typescript
// playback.store.ts — after refactor

togglePlayPause: async () => {
  const adapter = resolveOutput();
  const state = adapter.getPlaybackState();
  if (state.isPlaying) {
    await adapter.pause();
  } else {
    await adapter.resume();
  }
},

// skipNext resolves the next track from the queue, then:
await adapter.play(streamUrl, trackMetadata);
```

### Phase 3: Add speaker switching

The outputs store exposes `setActiveSpeaker(outputId, entityId)`. When switching:

1. Stop playback on the current adapter
2. Set the new active entity on the HA adapter (no reconnection needed — same WebSocket)
3. Transfer playback: resolve the current track's stream URL for the new adapter, call `play()`

The queue stays in the playback store — only the audio destination changes. Switching between HA speakers is instant since the WebSocket is already connected.

---

## Transfer Playback Flow

When the user switches from local to an HA speaker mid-session:

```
1. User taps "Kitchen Speaker" in output picker
2. outputs.store.setActiveSpeaker(haInstanceId, "media_player.kitchen")
3. Current adapter (local): stop()
4. HA adapter: setActiveEntity("media_player.kitchen")
   (already connected — just switches which entity receives commands)
5. playback.store: resolve current track's stream URL
   → check source capabilities: hasNetworkStreamUrl? ✓
   → get stream URL from source adapter
6. HA adapter: play(streamUrl, metadata)
7. RNTP switches to notification-only mode
   → updates Now Playing metadata for lock screen
   → remote events now forward to HA adapter
8. User sees same Now Playing UI, music comes from kitchen speaker
```

Switching between HA speakers (e.g. Kitchen → Living Room) on the same HA instance is even simpler — just `setActiveEntity()` and `play()` on the same adapter.

If the current track is a local download without a network URL:
- Skip to the next track that has a network-streamable source
- Show a toast: "Skipped [track] — not available on Kitchen Speaker"

---

## UI Considerations

### Output picker

A new component in the Now Playing UI — a small icon/button (like AirPlay) that opens a sheet listing all available speakers:

```
┌──────────────────────────────┐
│  Playing on                  │
│                              │
│  ● This Device          ✓   │
│  ○ Kitchen Speaker          │  ← media_player.kitchen
│  ○ Living Room              │  ← media_player.living_room
│  ○ Bedroom Sonos            │  ← media_player.bedroom
│                              │
│  + Add Home Assistant...    │
└──────────────────────────────┘
```

Speakers from all connected HA instances appear as a flat list. If multiple HA instances are connected, speakers are shown together (the output picker doesn't group by instance — the user cares about speaker names, not which HA server they're on).

### Speaker status

Each speaker row shows:
- Active: accent-colored checkmark
- Connecting: "Connecting..." subtitle
- Error: red "Connection error — tap to retry"
- Unavailable: dimmed, "Unavailable" subtitle (e.g. speaker is off)

### Unplayable tracks in queue

When viewing the queue with a network adapter active, tracks that can't stream (downloaded-only, no network URL) show a subtle indicator. Long-pressing explains why.

---

## Implementation Status

All steps are implemented:

1. `outputs` feature scaffolding — types, registry, barrel, store
2. `LocalOutputAdapter` extracted from playback store (wraps RNTP)
3. Output resolver wired into playback store (same injection pattern as source adapters)
4. `SourceStreamingCapabilities` added to source adapter interface + Jellyfin implementation
5. `output_configs` table + migration
6. `HAOutputAdapter` — connects to HA instance, discovers entities, routes commands to active entity
7. RNTP notification-only mode — lock screen metadata synced for network outputs
8. Output picker UI — modal sheet in Now Playing with speaker list
9. Add Output screen — HA URL + token (speakers discovered automatically)
10. Battery-conscious lifecycle — AppState listener, disconnect on background+idle

---

## Open Questions

1. **Speaker groups** — deferred. The current design is single-speaker. Groups would need a `GroupOutputAdapter` that fans out commands to multiple adapters. The interface supports this without changes (a group is just another `OutputAdapter`).

2. **Gapless playback on network outputs** — most HA media_players don't support gapless. The `canQueue` capability flag exists for future adapters that do. For now, there will be a brief gap between tracks on network outputs.

3. **Position sync drift** — HA's position interpolation may drift over long playback. Consider periodic re-sync (e.g., re-read entity state every 30s when playing). This should be cheap — it's a single WebSocket subscription event, not a poll.

4. **Multiple HA instances** — supported naturally. Each HA server is a separate output config with its own URL, token, and entity. Same pattern as multiple Jellyfin sources.

5. **Volume scope** — when controlling volume via Fermata on a network output, should it set the HA entity volume or the system volume? Probably entity volume (matching Spotify Connect behavior). The local adapter sets RNTP volume. This is already handled by the adapter abstraction.
