import z from "zod";

import { audiobookRowSchema, episodeRowSchema, trackRowSchema } from "../database/database.schemas";

import type { QueueItem } from "./playback.types";

// ── DB queue persistence schemas ──────────────────────

const playbackQueueItemBaseSchema = z.object({
  id: z.string(),
  startAt: z.number(),
});

const playbackQueueItemTrackSchema = playbackQueueItemBaseSchema.extend({
  type: z.literal('track'),
  item: trackRowSchema,
});

const playbackQueueItemAudiobookSchema = playbackQueueItemBaseSchema.extend({
  type: z.literal('audiobook'),
  item: audiobookRowSchema,
});

const playbackQueueItemEpisodeSchema = playbackQueueItemBaseSchema.extend({
  type: z.literal('episode'),
  item: episodeRowSchema,
});

const playbackQueueItemSchema = z.discriminatedUnion('type', [
  playbackQueueItemTrackSchema,
  playbackQueueItemAudiobookSchema,
  playbackQueueItemEpisodeSchema,
]);

type PlaybackQueueItem = z.infer<typeof playbackQueueItemSchema>;

// ── Converters: DB row → in-memory QueueItem ──────────

const trackRowToQueueItem = (row: z.infer<typeof trackRowSchema>): QueueItem => ({
  id: row.id,
  type: 'track',
  title: row.title,
  artistName: row.artistName,
  albumTitle: row.albumTitle,
  duration: row.duration,
  sourceId: row.sourceId,
  sourceItemId: row.sourceItemId,
  artworkSourceItemId: row.artworkSourceItemId,
  artworkUri: row.artworkUri,
  tracksProgress: false,
});

const episodeRowToQueueItem = (
  row: z.infer<typeof episodeRowSchema>,
  showTitle?: string | null,
  showArtworkUri?: string | null,
): QueueItem => ({
  id: row.id,
  type: 'episode',
  title: row.title,
  artistName: showTitle ?? '',
  albumTitle: showTitle ?? '',
  duration: row.duration,
  sourceId: row.sourceId,
  sourceItemId: row.sourceItemId,
  contentUrl: row.contentUrl,
  artworkSourceItemId: row.artworkSourceItemId,
  artworkUri: row.artworkUri ?? showArtworkUri ?? null,
  tracksProgress: true,
});

const audiobookRowToQueueItem = (row: z.infer<typeof audiobookRowSchema>): QueueItem => ({
  id: row.id,
  type: 'audiobook',
  title: row.title,
  artistName: row.authorName,
  albumTitle: '',
  duration: row.duration,
  sourceId: row.sourceId,
  sourceItemId: row.sourceItemId,
  artworkSourceItemId: row.artworkSourceItemId,
  artworkUri: row.artworkUri,
  tracksProgress: true,
});

export type { PlaybackQueueItem };
export {
  playbackQueueItemSchema,
  trackRowToQueueItem,
  episodeRowToQueueItem,
  audiobookRowToQueueItem,
};
