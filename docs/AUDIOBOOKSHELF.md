# Audiobookshelf Source Adapter

## Overview

The Audiobookshelf (ABS) adapter syncs podcast and audiobook libraries from an Audiobookshelf server into Fermata's local database. It implements the same `SourceAdapter` interface as Jellyfin, plus the optional `reportProgress()` and `getProgress()` methods for bidirectional playback progress tracking.

## API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/login` | POST | Authenticate with username/password → token |
| `/api/ping` | GET | Connection test |
| `/api/libraries` | GET | List all libraries (books and podcasts) |
| `/api/libraries/{id}/items` | GET | Paginated library items (expanded, includes episodes/chapters) |
| `/api/items/{id}` | GET | Single item detail |
| `/api/items/{id}/cover` | GET | Cover artwork |
| `/api/items/{id}/play[/{episodeId}]` | GET | Stream URL (with token query param) |
| `/api/me/progress/{id}[/{episodeId}]` | PATCH | Report playback progress |
| `/api/me` | GET | Fetch all media progress for the user |

All authenticated requests use `Authorization: Bearer {token}`.

## Data Model Mapping

ABS has two library types — `book` and `podcast` — each with different internal structure. Fermata maps both into its existing Artist/Album/Track model:

### Podcasts

| ABS Concept | Fermata Entity | mediaType |
|---|---|---|
| Podcast author | Artist | — |
| Podcast (library item) | Album | `'podcast'` |
| Episode | Track | `'podcast'` |

- Episodes carry `episodeNumber`, `publishedAt`, and `description`
- Ordering: by `publishedAt` descending (newest first)

### Audiobooks

| ABS Concept | Fermata Entity | mediaType |
|---|---|---|
| Book author | Artist | — |
| Book (library item) | Album | `'audiobook'` |
| Chapter | Track | `'audiobook'` |

- If the book has chapters, each chapter becomes a Track with `trackNumber` for ordering
- If no chapters, each audio file becomes a Track
- Book description stored in track `description`

## Compound sourceItemId

ABS episodes and chapters are nested under library items, not top-level entities. To fit Fermata's flat Track model, we use compound IDs:

```
Podcast episode:    "{libraryItemId}:{episodeId}"
Audiobook chapter:  "{libraryItemId}:{chapterId}"
Audiobook file:     "{libraryItemId}:{audioFileIno}"
```

The colon separator is safe because ABS IDs are alphanumeric. The adapter parses these internally for:
- Stream URL construction
- Progress reporting (needs both libraryItemId and optional episodeId)
- Artwork resolution (uses libraryItemId portion)

## Authentication

ABS uses username/password authentication via `POST /api/login`, which returns a user object containing a persistent API token. The token is stored in `sources.accessToken` (same as Jellyfin). The `userId` field stores the ABS user ID.

`restore()` rehydrates from `{baseUrl, userId, accessToken}` without re-authenticating — same pattern as Jellyfin.

## Progress Sync

See `docs/PROGRESS-TRACKING.md` for the full bidirectional sync protocol. ABS-specific details:

- **Push**: `PATCH /api/me/progress/{libraryItemId}[/{episodeId}]` with `{duration, currentTime, progress, isFinished}`
- **Pull**: `GET /api/me` returns `mediaProgress[]` with all progress entries for the user
- **Time format**: ABS uses seconds (float); Fermata uses milliseconds (integer). Conversion happens in the adapter.
- **Conflict resolution**: Local `needsSync` flag prevents remote overwrites of unpushed local changes

## Sync Behavior

- **No delta sync**: ABS API doesn't support `since` filtering. Each sync fetches all library items. This is acceptable for typical podcast/audiobook library sizes (hundreds, not tens of thousands like music).
- **Artists are synthetic**: ABS has no dedicated author endpoint. The adapter collects unique author names from all items, deduplicating by name per source.
- **Playlists**: ABS playlists are not synced (different concept from music playlists).

## File Structure

```
src/features/sources/audiobookshelf/
  audiobookshelf.ts          # Barrel (exports AudiobookshelfAdapter)
  audiobookshelf.api.ts      # Pure HTTP functions (no class state)
  audiobookshelf.adapter.ts  # SourceAdapter implementation
  audiobookshelf.types.ts    # ABS API response types
```

Follows the same pattern as `src/features/sources/jellyfin/`.
