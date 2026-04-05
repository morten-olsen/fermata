import { z } from 'zod';

// ── Sources ────────────────────────────────────────────

const baseSourceRow = z.object({
  id: z.string(),
  name: z.string().nullish(),
  lastSyncedAt: z.string().nullish(),
});

const jellyfinSourceRow = baseSourceRow.extend({
  type: z.literal('jellyfin'),
  config: z.object({
    baseUrl: z.string(),
    userId: z.string(),
    accessToken: z.string(),
  }),
});

const audiobookshelfSourceRow = baseSourceRow.extend({
  type: z.literal('audiobookshelf'),
  config: z.object({
    baseUrl: z.string(),
    userId: z.string(),
    accessToken: z.string(),
  }),
});

const sourceRowSchema = z.discriminatedUnion('type', [
  jellyfinSourceRow,
  audiobookshelfSourceRow,
]);

type SourceRow = z.infer<typeof sourceRowSchema>;

// ── Artists ────────────────────────────────────────────

const artistRowSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceItemId: z.string(),
  name: z.string(),
  artworkSourceItemId: z.string().nullish(),
  artworkUri: z.string().nullish(),
  isFavourite: z.boolean().nullish(),
  syncedAt: z.string(),
});

type ArtistRow = z.infer<typeof artistRowSchema>;

// ── Albums (music) ─────────────────────────────────────

const albumRowSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceItemId: z.string(),
  title: z.string(),
  artistName: z.string(),
  year: z.number().nullish(),
  artworkSourceItemId: z.string().nullish(),
  artworkUri: z.string().nullish(),
  trackCount: z.number().nullish(),
  isFavourite: z.boolean().nullish(),
  syncedAt: z.string(),
});

type AlbumRow = z.infer<typeof albumRowSchema>;

// ── Tracks (music) ─────────────────────────────────────

const trackRowSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceItemId: z.string(),
  title: z.string(),
  artistName: z.string(),
  albumTitle: z.string(),
  albumId: z.string().nullish(),
  duration: z.number(),
  trackNumber: z.number().nullish(),
  discNumber: z.number().nullish(),
  isFavourite: z.boolean().nullish(),
  artworkSourceItemId: z.string().nullish(),
  artworkUri: z.string().nullish(),
  syncedAt: z.string(),
});

type TrackRow = z.infer<typeof trackRowSchema>;

// ── Playlists / Mix Tapes ──────────────────────────────

const playlistRowSchema = z.object({
  id: z.string(),
  sourceId: z.string().nullish(),
  sourceItemId: z.string().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  artworkSourceItemId: z.string().nullish(),
  trackCount: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  syncedAt: z.string().nullish(),
});

type PlaylistRow = z.infer<typeof playlistRowSchema>;

// ── Audiobooks ─────────────────────────────────────────

const audiobookRowSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceItemId: z.string(),
  title: z.string(),
  authorName: z.string(),
  narratorName: z.string().nullish(),
  description: z.string().nullish(),
  duration: z.number(),
  artworkSourceItemId: z.string().nullish(),
  artworkUri: z.string().nullish(),
  isFavourite: z.boolean().nullish(),
  chapters: z.array(z.object({
    title: z.string(),
    startMs: z.number(),
    endMs: z.number(),
  })).nullish(),
  syncedAt: z.string(),
});

type AudiobookRow = z.infer<typeof audiobookRowSchema>;

// ── Shows (podcasts) ───────────────────────────────────

const showRowSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceItemId: z.string(),
  title: z.string(),
  authorName: z.string().nullish(),
  description: z.string().nullish(),
  artworkSourceItemId: z.string().nullish(),
  artworkUri: z.string().nullish(),
  isFavourite: z.boolean().nullish(),
  episodeCount: z.number().nullish(),
  syncedAt: z.string(),
});

type ShowRow = z.infer<typeof showRowSchema>;

// ── Episodes (podcasts) ────────────────────────────────

const episodeRowSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceItemId: z.string(),
  showId: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  duration: z.number(),
  publishedAt: z.string().nullish(),
  episodeNumber: z.number().nullish(),
  seasonNumber: z.number().nullish(),
  contentUrl: z.string().nullish(),
  artworkSourceItemId: z.string().nullish(),
  artworkUri: z.string().nullish(),
  syncedAt: z.string(),
});

type EpisodeRow = z.infer<typeof episodeRowSchema>;

// ── Queue ──────────────────────────────────────────────

const baseQueueItem = z.object({
  id: z.string(),
  position: z.number(),
});

const queueTrackItem = baseQueueItem.extend({
  type: z.literal('track'),
  trackId: z.string(),
});

const queueAudiobookItem = baseQueueItem.extend({
  type: z.literal('audiobook'),
  audiobookId: z.string(),
  startAtMs: z.number().nullish(),
});

const queueEpisodeItem = baseQueueItem.extend({
  type: z.literal('episode'),
  episodeId: z.string(),
});

const queueItemSchema = z.discriminatedUnion('type', [
  queueTrackItem,
  queueAudiobookItem,
  queueEpisodeItem,
]);

type QueueItem = z.infer<typeof queueItemSchema>;

// ── Playback Progress ──────────────────────────────────

const playbackProgressRowSchema = z.object({
  itemId: z.string(),
  itemType: z.enum(['episode', 'audiobook']),
  positionMs: z.number().default(0),
  durationMs: z.number().default(0),
  isCompleted: z.boolean().default(false),
  updatedAt: z.string(),
  needsSync: z.boolean().default(false),
});

type PlaybackProgressRow = z.infer<typeof playbackProgressRowSchema>;

// ── Exports ────────────────────────────────────────────

export type {
  SourceRow,
  ArtistRow,
  AlbumRow,
  TrackRow,
  PlaylistRow,
  AudiobookRow,
  ShowRow,
  EpisodeRow,
  QueueItem,
  PlaybackProgressRow,
};
export {
  jellyfinSourceRow,
  audiobookshelfSourceRow,
  sourceRowSchema,
  artistRowSchema,
  albumRowSchema,
  trackRowSchema,
  playlistRowSchema,
  audiobookRowSchema,
  showRowSchema,
  episodeRowSchema,
  queueItemSchema,
  playbackProgressRowSchema,
};
