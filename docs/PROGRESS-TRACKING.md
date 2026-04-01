# Playback Progress Tracking

## Overview

Fermata tracks playback progress for podcast episodes and audiobook chapters, enabling:
- **Resume playback** — tap an episode, continue from where you left off
- **Played/unplayed state** — visual indicator of completion status
- **Bidirectional sync** — progress syncs to and from the source server (e.g., Audiobookshelf)
- **Cross-output consistency** — progress is tracked whether playing locally (RNTP) or on a network speaker (Home Assistant)

Progress tracking is **not** applied to music tracks to avoid unnecessary database writes.

## Schema

```sql
CREATE TABLE playback_progress (
  track_id      TEXT PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  position_ms   INTEGER NOT NULL DEFAULT 0,
  duration_ms   INTEGER NOT NULL DEFAULT 0,
  is_completed  INTEGER NOT NULL DEFAULT 0,  -- 0 = in progress, 1 = finished
  updated_at    TEXT NOT NULL,                -- ISO 8601 timestamp
  needs_sync    INTEGER NOT NULL DEFAULT 0   -- 1 = local change not yet pushed
);
```

## Feature Structure

```
src/features/progress/
  progress.ts              # Barrel
  progress.types.ts        # ProgressEntry interface
  progress.queries.ts      # DB read/write operations
  progress.service.ts      # Business logic (recordProgress, getResumePosition)
```

`progress` is a **leaf feature** in the dependency graph — it depends only on `shared/db`. Both `playback` and `sync` import from it, but it imports no other features.

## Local Tracking

Progress is recorded at these moments:

| Event | Trigger | What happens |
|---|---|---|
| **Pause** | `isPlaying` transitions from true → false | Save current positionMs |
| **Track change** | User plays different track, skips next/prev | Save progress for previous track |
| **Periodic** | Every 30 seconds while playing | Save current positionMs (podcast/audiobook only) |
| **Skip to index** | User taps a track in the queue | Save progress for current track |

### Completion Detection

A track is marked `isCompleted = true` when `positionMs >= durationMs - 30000` (within 30 seconds of the end). Completed tracks resume from the beginning (position 0).

### Resume Logic

When playing a podcast or audiobook track:
1. After `adapter.play()` starts the stream
2. Check `getResumePosition(trackId)` — returns saved positionMs or 0
3. If > 0, use `scheduleSeekAfterLoad()` to seek after the player is ready
4. Network outputs (HA) use a longer delay before seeking (3s vs 300ms for local)

## Bidirectional Sync Protocol

### Push (Local → Source)

During sync, **before** pulling remote progress:
1. Query `playback_progress` rows where `needs_sync = 1` and `tracks.source_id` matches
2. For each entry, call `adapter.reportProgress(sourceItemId, positionMs, durationMs, isCompleted)`
3. On success, clear `needs_sync = 0`
4. On failure (offline), `needs_sync` stays set for next sync

### Pull (Source → Local)

After pushing:
1. Call `adapter.getProgress(trackSourceItemIds)` to fetch remote progress
2. For each entry, upsert into `playback_progress`
3. **Conflict rule**: If the local row has `needs_sync = 1`, skip the remote update (local is authoritative until pushed)
4. Otherwise, overwrite with remote values and set `needs_sync = 0`

### Conflict Resolution

The `needs_sync` flag acts as a simple conflict resolution mechanism:

```
Local needs_sync = 0, remote has update → Accept remote (overwrite local)
Local needs_sync = 1, remote has update → Keep local (push first, then accept remote on next sync)
Local needs_sync = 1, no remote update  → Push local on next sync
```

This is the same pattern used by `playlists.needs_sync` for offline playlist reconciliation.

## Per-Source Behavior

| Source | reportProgress | getProgress | Notes |
|---|---|---|---|
| Jellyfin | No | No | Music-only — no progress tracking needed |
| Audiobookshelf | Yes | Yes | Full bidirectional sync via `/api/me/progress/` |

Both methods are optional on the `SourceAdapter` interface. The sync engine checks for their existence before calling.

## Output Adapter Compatibility

Progress tracking works identically regardless of which output adapter is active:

- **Local (RNTP)**: `onPlaybackStateChange` reports positionMs directly
- **Home Assistant**: Position is interpolated from `media_position + elapsed time`; the playback store receives the same `positionMs` updates

The progress service is called from the playback store's adapter subscription callback, which is agnostic to the output type.
