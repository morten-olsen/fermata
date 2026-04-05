import { useCallback, useMemo } from "react";

import type { EpisodeRow } from "@/src/services/database/database.schemas";
import { DownloadService } from "@/src/services/downloads/downloads";
import type { DownloadItemChange } from "@/src/services/downloads/downloads.types";
import { PlaybackService } from "@/src/services/playback/playback.service";
import type { QueueItem } from "@/src/services/playback/playback.types";
import { ProgressService } from "@/src/services/progress/progress";
import type { ProgressItemChange } from "@/src/services/progress/progress.types";
import { ShowsService } from "@/src/services/shows/shows";
import type { LatestEpisode } from "@/src/services/shows/shows";
import { SyncService } from "@/src/services/sync/sync";

import { progressFraction } from "@/src/shared/lib/format";

import { useService } from "../service/service";
import { useServiceMutation } from "../service/service.mutation";
import { useServiceQuery } from "../service/service.query";
import { useReactiveList } from "../service/service.reactive-list";
import type { ItemPatch, ListPatch } from "../service/service.reactive-list";

// ── Enriched types ───────────────────────────────────────

type EnrichedEpisode = EpisodeRow & {
  progress: number | null;
  isCompleted: boolean;
  isDownloaded: boolean;
  isPlaying: boolean;
};

type EnrichedLatestEpisode = LatestEpisode & {
  progress: number | null;
  isCompleted: boolean;
};

// ���─ Shared patch factories ───────────────────────────────

const episodeProgressPatch = (
  progressService: ProgressService,
): ItemPatch<EnrichedEpisode> => ({
  emitter: progressService,
  event: 'itemChanged',
  apply: (change: ProgressItemChange) => ({
    key: change.itemId,
    update: (item: EnrichedEpisode) => ({
      ...item,
      progress: progressFraction(change.positionMs, change.durationMs),
      isCompleted: change.isCompleted,
    }),
  }),
});

const episodeDownloadPatch = (
  downloadService: DownloadService,
): ItemPatch<EnrichedEpisode> => ({
  emitter: downloadService,
  event: 'itemDownloadChanged',
  apply: (change: DownloadItemChange) => {
    if (change.itemType !== 'episode') return null;
    return {
      key: change.itemId,
      update: (item: EnrichedEpisode) => ({
        ...item,
        isDownloaded: change.isDownloaded,
      }),
    };
  },
});

// ── useShows ─────────────────────────────────────────────

const showEvents = ['changed'] as const;

const useShows = () => {
  const showsService = useService(ShowsService);
  const syncService = useService(SyncService);
  const query = useCallback(() => showsService.findAll(), [showsService]);

  const { data: shows = [], loading } = useServiceQuery({
    emitter: showsService,
    query,
    events: [...showEvents],
    invalidateOn: [
      { emitter: syncService, events: ['syncCompleted'] },
    ],
  });

  return { shows, loading };
};

// ── useShow ──────────────────────────────────────────────

const useShow = (id: string) => {
  const showsService = useService(ShowsService);
  const query = useCallback(() => showsService.findById(id), [showsService, id]);

  const { data: show, loading } = useServiceQuery({
    emitter: showsService,
    query,
    events: [...showEvents],
  });

  return { show, loading };
};

// ── Shared enrichment helper ─────────────────────────────

const enrichWithProgress = async <T extends { id: string; duration: number }>(
  episodes: T[],
  progressService: ProgressService,
): Promise<(T & { progress: number | null; isCompleted: boolean })[]> => {
  const ids = episodes.map((e) => e.id);
  const progressMap = await progressService.getProgressBatch(ids);

  return episodes.map((ep) => {
    const entry = progressMap.get(ep.id);
    const durationMs = ep.duration * 1000;
    return {
      ...ep,
      progress: entry ? progressFraction(entry.positionMs, durationMs) : null,
      isCompleted: entry?.isCompleted ?? false,
    };
  });
};

// ── useShowEpisodes ──────────────────────────────────────

const useShowEpisodes = (showId: string) => {
  const showsService = useService(ShowsService);
  const progressService = useService(ProgressService);
  const downloadService = useService(DownloadService);
  const playbackService = useService(PlaybackService);
  const syncService = useService(SyncService);

  const query = useCallback(async (): Promise<EnrichedEpisode[]> => {
    const episodes = await showsService.getEpisodes(showId);
    const enriched = await enrichWithProgress(episodes, progressService);
    const currentTrack = playbackService.getCurrentTrack();

    return enriched.map((ep) => ({
      ...ep,
      isDownloaded: downloadService.isDownloaded(ep.id, 'episode'),
      isPlaying: currentTrack?.id === ep.id,
    }));
  }, [showsService, progressService, downloadService, playbackService, showId]);

  const refetchOn = useMemo(() => [
    { emitter: showsService, events: ['changed'] },
    { emitter: syncService, events: ['syncCompleted'] },
  ], [showsService, syncService]);

  const patchOn = useMemo(() => [
    episodeProgressPatch(progressService),
    episodeDownloadPatch(downloadService),
  ], [progressService, downloadService]);

  const listPatchOn: ListPatch<EnrichedEpisode>[] = useMemo(() => [
    {
      emitter: playbackService,
      event: 'trackChanged',
      apply: (track: QueueItem | null) => {
        const playingId = track?.id ?? null;
        return (item: EnrichedEpisode) => {
          const shouldPlay = item.id === playingId;
          if (item.isPlaying === shouldPlay) return item;
          return { ...item, isPlaying: shouldPlay };
        };
      },
    },
  ], [playbackService]);

  const { data: episodes, loading } = useReactiveList({
    query,
    keyOf: (item) => item.id,
    refetchOn,
    patchOn,
    listPatchOn,
  });

  return { episodes, loading };
};

// ── useLatestUnplayed ────────────────────────────────────

const useLatestUnplayed = () => {
  const showsService = useService(ShowsService);
  const progressService = useService(ProgressService);
  const syncService = useService(SyncService);

  const query = useCallback(async (): Promise<EnrichedLatestEpisode[]> => {
    const episodes = await showsService.getLatestUnplayed();
    return enrichWithProgress(episodes, progressService);
  }, [showsService, progressService]);

  const refetchOn = useMemo(() => [
    { emitter: showsService, events: ['changed'] },
    { emitter: syncService, events: ['syncCompleted'] },
  ], [showsService, syncService]);

  const { data: episodes, loading } = useReactiveList({
    query,
    keyOf: (item) => item.id,
    refetchOn,
  });

  return { episodes, loading };
};

// ── Mutations ────────────────────────────────────────────

const useToggleShowFavourite = () => {
  const showsService = useService(ShowsService);
  return useServiceMutation(showsService.toggleFavourite);
};

export type { EnrichedEpisode, EnrichedLatestEpisode };
export { useShows, useShow, useShowEpisodes, useLatestUnplayed, useToggleShowFavourite };
