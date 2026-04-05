import { useCallback, useEffect, useState } from "react";

import { SyncService } from "@/src/services/sync/sync";
import type { SyncProgress } from "@/src/services/sync/sync";
import type { SourceRow } from "@/src/services/database/database.schemas";

import { useService } from "../service/service";
import { useServiceMutation } from "../service/service.mutation";

const useSyncAll = () => {
  const syncService = useService(SyncService);
  const fn = useCallback(
    (sources: SourceRow[]) => syncService.syncAll(sources),
    [syncService],
  );
  return useServiceMutation(fn);
};

const useSyncProgress = () => {
  const syncService = useService(SyncService);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const opts = { abortSignal: controller.signal };

    syncService.on('syncStarted', () => {
      setIsSyncing(true);
      setProgress(null);
    }, opts);

    syncService.on('syncProgress', (p) => {
      setProgress(p);
    }, opts);

    syncService.on('syncCompleted', () => {
      setIsSyncing(false);
      setProgress(null);
    }, opts);

    syncService.on('syncFailed', () => {
      setIsSyncing(false);
      setProgress(null);
    }, opts);

    return () => { controller.abort(); };
  }, [syncService]);

  return { isSyncing, progress };
};

export { useSyncAll, useSyncProgress };
