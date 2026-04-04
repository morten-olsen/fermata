import { useCallback } from "react";

import { DownloadService } from "@/src/services/downloads/downloads";
import type { DownloadItemType, PinEntityType } from "@/src/services/downloads/downloads.types";

import { useService } from "../service/service";
import { useServiceQuery } from "../service/service.query";
import { useServiceMutation } from "../service/service.mutation";

const statsEvents = ['statusChanged'] as const;
const pinEvents = ['pinChanged'] as const;

const useDownloadStats = () => {
  const service = useService(DownloadService);
  const query = useCallback(() => service.getStats(), [service]);

  return useServiceQuery({
    emitter: service,
    query,
    events: [...statsEvents],
  });
};

const useIsDownloaded = (itemId: string, itemType: DownloadItemType) => {
  const service = useService(DownloadService);
  return service.isDownloaded(itemId, itemType);
};

const useIsQueued = (itemId: string, itemType: DownloadItemType) => {
  const service = useService(DownloadService);
  return service.isQueued(itemId, itemType);
};

const useDownloadFilePath = (itemId: string, itemType: DownloadItemType) => {
  const service = useService(DownloadService);
  return service.getFilePath(itemId, itemType);
};

const usePinForOffline = () => {
  const service = useService(DownloadService);
  return useServiceMutation(
    (params: { entityType: PinEntityType; entityId: string; sourceId: string }) =>
      service.pin(params.entityType, params.entityId, params.sourceId),
  );
};

const useUnpinOffline = () => {
  const service = useService(DownloadService);
  return useServiceMutation(
    (params: { entityType: PinEntityType; entityId: string }) =>
      service.unpin(params.entityType, params.entityId),
  );
};

const useIsPinned = (entityType: PinEntityType, entityId: string) => {
  const service = useService(DownloadService);
  const query = useCallback(
    () => service.isPinned(entityType, entityId),
    [service, entityType, entityId],
  );

  return useServiceQuery({
    emitter: service,
    query,
    events: [...pinEvents],
  });
};

const useRetryFailedDownloads = () => {
  const service = useService(DownloadService);
  return useServiceMutation(() => service.retryFailed());
};

const useRemoveAllDownloads = () => {
  const service = useService(DownloadService);
  return useServiceMutation(() => service.removeAllDownloads());
};

const useOfflineMode = () => {
  const service = useService(DownloadService);
  const query = useCallback(() => Promise.resolve(service.offlineMode), [service]);

  const { data: offlineMode = false } = useServiceQuery({
    emitter: service,
    query,
    events: [...statsEvents],
  });

  return { offlineMode, setOfflineMode: service.setOfflineMode };
};

export {
  useDownloadStats,
  useIsDownloaded,
  useIsQueued,
  useDownloadFilePath,
  usePinForOffline,
  useUnpinOffline,
  useIsPinned,
  useRetryFailedDownloads,
  useRemoveAllDownloads,
  useOfflineMode,
};
