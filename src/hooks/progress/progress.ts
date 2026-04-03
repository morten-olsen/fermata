import { useCallback } from "react";

import { ProgressService } from "@/src/services/progress/progress";
import { PlaybackService } from "@/src/services/playback/playback.service";

import { useService } from "../service/service";
import { useServiceQuery } from "../service/service.query";

const useProgress = (itemId: string) => {
  const service = useService(ProgressService);
  const playbackService = useService(PlaybackService);
  const query = useCallback(() => service.getProgress(itemId), [service, itemId]);

  return useServiceQuery({
    emitter: playbackService,
    query,
    events: ['stateChanged'],
  });
};

const useProgressBatch = (itemIds: string[]) => {
  const service = useService(ProgressService);
  const playbackService = useService(PlaybackService);
  const query = useCallback(() => service.getProgressBatch(itemIds), [service, itemIds]);

  return useServiceQuery({
    emitter: playbackService,
    query,
    events: ['stateChanged'],
  });
};

const useShowProgressSummaries = (showIds: string[]) => {
  const service = useService(ProgressService);
  const playbackService = useService(PlaybackService);
  const query = useCallback(() => service.getShowProgressSummaries(showIds), [service, showIds]);

  return useServiceQuery({
    emitter: playbackService,
    query,
    events: ['stateChanged'],
  });
};

export { useProgress, useProgressBatch, useShowProgressSummaries };
