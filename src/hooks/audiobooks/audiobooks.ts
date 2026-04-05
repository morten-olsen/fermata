import { useCallback } from "react";

import { AudiobooksService } from "@/src/services/audiobooks/audiobooks";

import { useService } from "../service/service";
import { useServiceMutation } from "../service/service.mutation";
import { useServiceQuery } from "../service/service.query";

const audiobookEvents = ['changed'] as const;

const useAudiobooks = () => {
  const audiobooksService = useService(AudiobooksService);
  const query = useCallback(() => audiobooksService.findAll(), [audiobooksService]);

  const { data: audiobooks = [], loading } = useServiceQuery({
    emitter: audiobooksService,
    query,
    events: [...audiobookEvents],
  });

  return { audiobooks, loading };
};

const useAudiobook = (id: string) => {
  const audiobooksService = useService(AudiobooksService);
  const query = useCallback(() => audiobooksService.findById(id), [audiobooksService, id]);

  const { data: audiobook, loading } = useServiceQuery({
    emitter: audiobooksService,
    query,
    events: [...audiobookEvents],
  });

  return { audiobook, loading };
};

const useToggleAudiobookFavourite = () => {
  const audiobooksService = useService(AudiobooksService);
  return useServiceMutation(audiobooksService.toggleFavourite);
};

export { useAudiobooks, useAudiobook, useToggleAudiobookFavourite };
