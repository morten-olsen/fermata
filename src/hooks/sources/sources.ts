import { useCallback } from "react";

import { SourcesService } from "@/src/services/sources/sources";

import { useServiceQuery } from "../service/service.query";
import { useServiceMutation } from "../service/service.mutation";
import { useService } from "../service/service";

const sourceEvents = ['sourceAdded', 'sourceRemoved', 'sourceUpdated'] as const;

const useSources = () => {
  const sourcesService = useService(SourcesService);
  const query = useCallback(() => sourcesService.findAll(), [sourcesService]);

  const { data: sources = [], loading } = useServiceQuery({
    emitter: sourcesService,
    query,
    events: [...sourceEvents],
  });

  return { sources, loading };
};

const useAddSource = () => {
  const sourcesService = useService(SourcesService);
  return useServiceMutation(sourcesService.addFromCredentials);
};

const useRemoveSource = () => {
  const sourcesService = useService(SourcesService);
  return useServiceMutation(sourcesService.remove);
};

export { useSources, useAddSource, useRemoveSource };
