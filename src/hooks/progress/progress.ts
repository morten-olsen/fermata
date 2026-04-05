import { useCallback, useMemo } from "react";

import { ProgressService } from "@/src/services/progress/progress";

import { useService } from "../service/service";
import { useServiceQuery } from "../service/service.query";

const useProgress = (itemId: string) => {
  const service = useService(ProgressService);
  const query = useCallback(() => service.getProgress(itemId), [service, itemId]);
  const events = useMemo(() => [`changed:${itemId}` as const], [itemId]);

  return useServiceQuery({
    emitter: service,
    query,
    events,
  });
};

const useProgressBatch = (itemIds: string[]) => {
  const service = useService(ProgressService);
  const query = useCallback(() => service.getProgressBatch(itemIds), [service, itemIds]);

  return useServiceQuery({
    emitter: service,
    query,
    events: ['changed'],
  });
};

const useShowProgressSummaries = (showIds: string[]) => {
  const service = useService(ProgressService);
  const query = useCallback(() => service.getShowProgressSummaries(showIds), [service, showIds]);

  return useServiceQuery({
    emitter: service,
    query,
    events: ['changed'],
  });
};

export { useProgress, useProgressBatch, useShowProgressSummaries };
