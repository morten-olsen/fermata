import { useCallback } from "react";

import { PlaybackService } from "@/src/services/playback/playback.service";

import { useService } from "../service/service";
import { useServiceQuery } from "../service/service.query";
import { useServiceMutation } from "../service/service.mutation";

// ── State hooks ───────────────────────────────────────

const usePlaybackState = () => {
  const service = useService(PlaybackService);
  const query = useCallback(() => Promise.resolve(service.getState()), [service]);

  return useServiceQuery({
    emitter: service,
    query,
    events: ['stateChanged'],
  });
};

const useCurrentTrack = () => {
  const service = useService(PlaybackService);
  const query = useCallback(() => Promise.resolve(service.getCurrentTrack()), [service]);

  return useServiceQuery({
    emitter: service,
    query,
    events: ['trackChanged'],
  });
};

const usePlaybackQueue = () => {
  const service = useService(PlaybackService);
  const query = useCallback(
    () => Promise.resolve({ queue: service.getQueue(), currentTrack: service.getCurrentTrack() }),
    [service],
  );

  return useServiceQuery({
    emitter: service,
    query,
    events: ['queueChanged'],
  });
};

// ── Action hooks ──────────────────────────────────────

const usePlayTrack = () => {
  const service = useService(PlaybackService);
  return useServiceMutation(service.playTrack);
};

const usePlayAlbum = () => {
  const service = useService(PlaybackService);
  return useServiceMutation(
    (params: { albumId: string; startIndex?: number }) =>
      service.playAlbum(params.albumId, params.startIndex),
  );
};

const useShuffleAlbum = () => {
  const service = useService(PlaybackService);
  return useServiceMutation(service.shuffleAlbum);
};

const usePlayTracks = () => {
  const service = useService(PlaybackService);
  return useServiceMutation(
    (params: { trackIds: string[]; startIndex?: number }) =>
      service.playTracks(params.trackIds, params.startIndex),
  );
};

const useTogglePlayPause = () => {
  const service = useService(PlaybackService);
  return useServiceMutation(() => service.togglePlayPause());
};

const useSkipNext = () => {
  const service = useService(PlaybackService);
  return useServiceMutation(() => service.skipNext());
};

const useSkipPrevious = () => {
  const service = useService(PlaybackService);
  return useServiceMutation(() => service.skipPrevious());
};

const useSkipToIndex = () => {
  const service = useService(PlaybackService);
  return useServiceMutation(service.skipToIndex);
};

const useSeekTo = () => {
  const service = useService(PlaybackService);
  return useServiceMutation(service.seekTo);
};

const useSetVolume = () => {
  const service = useService(PlaybackService);
  return useServiceMutation(service.setVolume);
};

export {
  usePlaybackState,
  useCurrentTrack,
  usePlaybackQueue,
  usePlayTrack,
  usePlayAlbum,
  useShuffleAlbum,
  usePlayTracks,
  useTogglePlayPause,
  useSkipNext,
  useSkipPrevious,
  useSkipToIndex,
  useSeekTo,
  useSetVolume,
};
