import { useCallback } from "react";

import { PlaylistsService } from "@/src/services/playlists/playlists";

import { useService } from "../service/service";
import { useServiceQuery } from "../service/service.query";
import { useServiceMutation } from "../service/service.mutation";

const playlistEvents = ['changed'] as const;

const usePlaylists = () => {
  const service = useService(PlaylistsService);
  const query = useCallback(() => service.findAllWithCount(), [service]);

  return useServiceQuery({
    emitter: service,
    query,
    events: [...playlistEvents],
  });
};

const usePlaylist = (id: string) => {
  const service = useService(PlaylistsService);
  const query = useCallback(() => service.findById(id), [service, id]);

  return useServiceQuery({
    emitter: service,
    query,
    events: [...playlistEvents],
  });
};

const usePlaylistTracks = (playlistId: string) => {
  const service = useService(PlaylistsService);
  const query = useCallback(() => service.getTracks(playlistId), [service, playlistId]);

  return useServiceQuery({
    emitter: service,
    query,
    events: [...playlistEvents],
  });
};

const useCreatePlaylist = () => {
  const service = useService(PlaylistsService);
  return useServiceMutation(service.create);
};

const useDeletePlaylist = () => {
  const service = useService(PlaylistsService);
  return useServiceMutation(service.remove);
};

const useAddTrackToPlaylist = () => {
  const service = useService(PlaylistsService);
  return useServiceMutation(
    (params: { playlistId: string; trackId: string }) =>
      service.addTrack(params.playlistId, params.trackId),
  );
};

const useRemoveTrackFromPlaylist = () => {
  const service = useService(PlaylistsService);
  return useServiceMutation(
    (params: { playlistId: string; trackId: string }) =>
      service.removeTrack(params.playlistId, params.trackId),
  );
};

export {
  usePlaylists,
  usePlaylist,
  usePlaylistTracks,
  useCreatePlaylist,
  useDeletePlaylist,
  useAddTrackToPlaylist,
  useRemoveTrackFromPlaylist,
};
