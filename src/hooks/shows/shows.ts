import { useCallback } from "react";

import { ShowsService } from "@/src/services/shows/shows";

import { useService } from "../service/service";
import { useServiceQuery } from "../service/service.query";

const showEvents = ['changed'] as const;

const useShows = () => {
  const showsService = useService(ShowsService);
  const query = useCallback(() => showsService.findAll(), [showsService]);

  const { data: shows = [], loading } = useServiceQuery({
    emitter: showsService,
    query,
    events: [...showEvents],
  });

  return { shows, loading };
};

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

const useShowEpisodes = (showId: string) => {
  const showsService = useService(ShowsService);
  const query = useCallback(() => showsService.getEpisodes(showId), [showsService, showId]);

  const { data: episodes = [], loading } = useServiceQuery({
    emitter: showsService,
    query,
    events: [...showEvents],
  });

  return { episodes, loading };
};

export { useShows, useShow, useShowEpisodes };
