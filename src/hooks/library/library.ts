import { useCallback } from "react";

import { SyncService } from "@/src/services/sync/sync";

import { useService } from "../service/service";
import { useServiceQuery } from "../service/service.query";

const emptyStats = {
  artists: 0,
  albums: 0,
  tracks: 0,
  shows: 0,
  episodes: 0,
  audiobooks: 0,
};

const syncEvents = ['syncCompleted'] as const;

const useLibraryStats = () => {
  const syncService = useService(SyncService);
  const query = useCallback(() => syncService.getStats(), [syncService]);

  const { data: stats = emptyStats, loading } = useServiceQuery({
    emitter: syncService,
    query,
    events: [...syncEvents],
  });

  return { stats, loading };
};

export { useLibraryStats };
