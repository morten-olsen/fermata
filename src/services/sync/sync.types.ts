type SyncPhase = 'artists' | 'albums' | 'tracks' | 'shows' | 'episodes' | 'audiobooks' | 'artwork';

type SyncProgress = {
  sourceId: string;
  phase: SyncPhase;
  count: number;
};

type SyncResult = {
  sourceId: string;
  artists: number;
  albums: number;
  tracks: number;
  shows: number;
  episodes: number;
  audiobooks: number;
};

type SyncServiceEvents = {
  syncStarted: (sourceId: string) => void;
  syncProgress: (progress: SyncProgress) => void;
  syncCompleted: (result: SyncResult) => void;
  syncFailed: (sourceId: string, error: Error) => void;
};

export type { SyncPhase, SyncProgress, SyncResult, SyncServiceEvents };
