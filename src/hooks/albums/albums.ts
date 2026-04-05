import { useCallback, useMemo } from "react";

import { AlbumsService } from "@/src/services/albums/albums";
import type { TrackRow } from "@/src/services/database/database.schemas";
import { DownloadService } from "@/src/services/downloads/downloads";
import type { DownloadItemChange } from "@/src/services/downloads/downloads.types";
import { PlaybackService } from "@/src/services/playback/playback.service";
import type { QueueItem } from "@/src/services/playback/playback.types";
import { SyncService } from "@/src/services/sync/sync";

import { useService } from "../service/service";
import { useServiceQuery } from "../service/service.query";
import { useServiceMutation } from "../service/service.mutation";
import { useReactiveList } from "../service/service.reactive-list";
import type { ItemPatch, ListPatch } from "../service/service.reactive-list";

// ── Enriched type ────────────────────────────────────────

type EnrichedTrack = TrackRow & {
  isPlaying: boolean;
  isDownloaded: boolean;
  isQueued: boolean;
};

// ── List hooks ───────────────────────────────────────────

const albumEvents = ['changed'] as const;

const useAlbums = () => {
  const albumsService = useService(AlbumsService);
  const syncService = useService(SyncService);
  const query = useCallback(() => albumsService.findAll(), [albumsService]);

  const { data: albums = [], loading } = useServiceQuery({
    emitter: albumsService,
    query,
    events: [...albumEvents],
    invalidateOn: [
      { emitter: syncService, events: ['syncCompleted'] },
    ],
  });

  return { albums, loading };
};

const useAlbumTracks = (albumId: string) => {
  const albumsService = useService(AlbumsService);
  const downloadService = useService(DownloadService);
  const playbackService = useService(PlaybackService);
  const syncService = useService(SyncService);

  const query = useCallback(async (): Promise<EnrichedTrack[]> => {
    const tracks = await albumsService.getTracks(albumId);
    const currentTrack = playbackService.getCurrentTrack();

    return tracks.map((track) => ({
      ...track,
      isPlaying: currentTrack?.id === track.id,
      isDownloaded: downloadService.isDownloaded(track.id, 'track'),
      isQueued: downloadService.isQueued(track.id, 'track'),
    }));
  }, [albumsService, downloadService, playbackService, albumId]);

  const refetchOn = useMemo(() => [
    { emitter: albumsService, events: ['changed'] },
    { emitter: syncService, events: ['syncCompleted'] },
  ], [albumsService, syncService]);

  const patchOn: ItemPatch<EnrichedTrack>[] = useMemo(() => [
    {
      emitter: downloadService,
      event: 'itemDownloadChanged',
      apply: (change: DownloadItemChange) => {
        if (change.itemType !== 'track') return null;
        return {
          key: change.itemId,
          update: (item: EnrichedTrack) => ({
            ...item,
            isDownloaded: change.isDownloaded,
            isQueued: false,
          }),
        };
      },
    },
  ], [downloadService]);

  const listPatchOn: ListPatch<EnrichedTrack>[] = useMemo(() => [
    {
      emitter: playbackService,
      event: 'trackChanged',
      apply: (track: QueueItem | null) => {
        const playingId = track?.id ?? null;
        return (item: EnrichedTrack) => {
          const shouldPlay = item.id === playingId;
          if (item.isPlaying === shouldPlay) return item;
          return { ...item, isPlaying: shouldPlay };
        };
      },
    },
  ], [playbackService]);

  const { data: tracks, loading } = useReactiveList({
    query,
    keyOf: (item) => item.id,
    refetchOn,
    patchOn,
    listPatchOn,
  });

  return { tracks, loading };
};

const useFavouriteAlbums = () => {
  const albumsService = useService(AlbumsService);
  const syncService = useService(SyncService);
  const query = useCallback(() => albumsService.findFavourites(), [albumsService]);

  const { data: albums = [], loading } = useServiceQuery({
    emitter: albumsService,
    query,
    events: [...albumEvents],
    invalidateOn: [
      { emitter: syncService, events: ['syncCompleted'] },
    ],
  });

  return { albums, loading };
};

const useRecentlyAddedAlbums = (limit = 20) => {
  const albumsService = useService(AlbumsService);
  const syncService = useService(SyncService);
  const query = useCallback(() => albumsService.findRecentlyAdded(limit), [albumsService, limit]);

  const { data: albums = [], loading } = useServiceQuery({
    emitter: albumsService,
    query,
    events: [...albumEvents],
    invalidateOn: [
      { emitter: syncService, events: ['syncCompleted'] },
    ],
  });

  return { albums, loading };
};

// ── Single item hooks ────────────────────────────────────

const useAlbum = (id: string) => {
  const albumsService = useService(AlbumsService);
  const query = useCallback(() => albumsService.findById(id), [albumsService, id]);

  const { data: album, loading } = useServiceQuery({
    emitter: albumsService,
    query,
    events: [...albumEvents],
  });

  return { album, loading };
};

const useAlbumsByArtist = (artistName: string) => {
  const albumsService = useService(AlbumsService);
  const syncService = useService(SyncService);
  const query = useCallback(
    () => albumsService.findByArtist(artistName),
    [albumsService, artistName],
  );

  const { data: albums = [], loading } = useServiceQuery({
    emitter: albumsService,
    query,
    events: [...albumEvents],
    invalidateOn: [
      { emitter: syncService, events: ['syncCompleted'] },
    ],
  });

  return { albums, loading };
};

// ── Mutations ────────────────────────────────────────────

const useToggleAlbumFavourite = () => {
  const albumsService = useService(AlbumsService);
  return useServiceMutation(albumsService.toggleFavourite);
};

const useSearchAlbums = () => {
  const albumsService = useService(AlbumsService);
  return useServiceMutation(albumsService.search);
};

export type { EnrichedTrack };
export { useAlbums, useAlbum, useAlbumTracks, useAlbumsByArtist, useFavouriteAlbums, useRecentlyAddedAlbums, useToggleAlbumFavourite, useSearchAlbums };
