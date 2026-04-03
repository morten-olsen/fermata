import { useCallback } from "react";

import { ArtistsService } from "@/src/services/artists/artists";

import { useService } from "../service/service";
import { useServiceQuery } from "../service/service.query";

const artistEvents = ['changed'] as const;

const useArtists = () => {
  const artistsService = useService(ArtistsService);
  const query = useCallback(() => artistsService.findAll(), [artistsService]);

  const { data: artists = [], loading } = useServiceQuery({
    emitter: artistsService,
    query,
    events: [...artistEvents],
  });

  return { artists, loading };
};

export { useArtists };
