import z from "zod";

import { audiobookRowSchema, episodeRowSchema, trackRowSchema } from "../database/database.schemas";

const playbackQueueItemBaseSchema = z.object({
  id: z.string(),
  startAt: z.number(),
});

const playbackQueueItemTrackSchema = playbackQueueItemBaseSchema.extend({
  type: 'track',
  item: trackRowSchema,
});

const playbackQueueItemAudiobookSchema = playbackQueueItemBaseSchema.extend({
  type: 'audiobook',
  item: audiobookRowSchema,
});

const playbackQueueItemEpisodeSchema = playbackQueueItemBaseSchema.extend({
  type: 'episode',
  item: episodeRowSchema,
});

const playbackQueueItemSchema = z.discriminatedUnion('type', [
  playbackQueueItemTrackSchema,
  playbackQueueItemAudiobookSchema,
  playbackQueueItemEpisodeSchema,
]);

type PlaybackQueueItem = z.infer<typeof playbackQueueItemSchema>;

export type { PlaybackQueueItem }
export { playbackQueueItemSchema };

