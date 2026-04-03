import { useCallback } from "react";

import { TracksService } from "@/src/services/tracks/tracks";

import { useService } from "../service/service";
import { useServiceQuery } from "../service/service.query";

const trackEvents = ['changed'] as const;

const useTracks = () => {
  const tracksService = useService(TracksService);
  const query = useCallback(() => tracksService.findAll(), [tracksService]);

  const { data: tracks = [], loading } = useServiceQuery({
    emitter: tracksService,
    query,
    events: [...trackEvents],
  });

  return { tracks, loading };
};

const useTrack = (id: string) => {
  const tracksService = useService(TracksService);
  const query = useCallback(() => tracksService.findById(id), [tracksService, id]);

  const { data: track, loading } = useServiceQuery({
    emitter: tracksService,
    query,
    events: [...trackEvents],
  });

  return { track, loading };
};

export { useTracks, useTrack };
