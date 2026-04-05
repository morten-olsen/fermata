import { useCallback, useMemo } from "react";

import { AudiobooksService } from "@/src/services/audiobooks/audiobooks";
import type { AudiobookRow } from "@/src/services/database/database.schemas";
import { DownloadService } from "@/src/services/downloads/downloads";
import type { DownloadItemChange } from "@/src/services/downloads/downloads.types";
import { ProgressService } from "@/src/services/progress/progress";
import type { ProgressItemChange } from "@/src/services/progress/progress.types";
import { SyncService } from "@/src/services/sync/sync";

import { progressFraction } from "@/src/shared/lib/format";

import { useService } from "../service/service";
import { useServiceMutation } from "../service/service.mutation";
import { useServiceQuery } from "../service/service.query";
import { useReactiveList } from "../service/service.reactive-list";
import type { ItemPatch } from "../service/service.reactive-list";

// ── Enriched type ────────────────────────────────────────

type EnrichedAudiobook = AudiobookRow & {
  progress: number | null;
  isDownloaded: boolean;
};

// ── List hook ────────────────────────────────────────────

const useAudiobooks = () => {
  const audiobooksService = useService(AudiobooksService);
  const progressService = useService(ProgressService);
  const downloadService = useService(DownloadService);
  const syncService = useService(SyncService);

  const query = useCallback(async (): Promise<EnrichedAudiobook[]> => {
    const audiobooks = await audiobooksService.findAll();
    const ids = audiobooks.map((b) => b.id);
    const progressMap = await progressService.getProgressBatch(ids);

    return audiobooks.map((book) => {
      const entry = progressMap.get(book.id);
      const durationMs = book.duration * 1000;
      return {
        ...book,
        progress: entry ? progressFraction(entry.positionMs, durationMs) : null,
        isDownloaded: downloadService.isDownloaded(book.id, 'audiobook'),
      };
    });
  }, [audiobooksService, progressService, downloadService]);

  const refetchOn = useMemo(() => [
    { emitter: audiobooksService, events: ['changed'] },
    { emitter: syncService, events: ['syncCompleted'] },
  ], [audiobooksService, syncService]);

  const patchOn: ItemPatch<EnrichedAudiobook>[] = useMemo(() => [
    {
      emitter: progressService,
      event: 'itemChanged',
      apply: (change: ProgressItemChange) => ({
        key: change.itemId,
        update: (item: EnrichedAudiobook) => ({
          ...item,
          progress: progressFraction(change.positionMs, change.durationMs),
        }),
      }),
    },
    {
      emitter: downloadService,
      event: 'itemDownloadChanged',
      apply: (change: DownloadItemChange) => {
        if (change.itemType !== 'audiobook') return null;
        return {
          key: change.itemId,
          update: (item: EnrichedAudiobook) => ({
            ...item,
            isDownloaded: change.isDownloaded,
          }),
        };
      },
    },
  ], [progressService, downloadService]);

  const { data: audiobooks, loading } = useReactiveList({
    query,
    keyOf: (item) => item.id,
    refetchOn,
    patchOn,
  });

  return { audiobooks, loading };
};

// ── Single item hook ─────────────────────────────────────

const audiobookEvents = ['changed'] as const;

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

// ── Mutations ────────────────────────────────────────────

const useToggleAudiobookFavourite = () => {
  const audiobooksService = useService(AudiobooksService);
  return useServiceMutation(audiobooksService.toggleFavourite);
};

export type { EnrichedAudiobook };
export { useAudiobooks, useAudiobook, useToggleAudiobookFavourite };
