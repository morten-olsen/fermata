type ProgressEntry = {
  itemId: string;
  itemType: string;
  positionMs: number;
  durationMs: number;
  isCompleted: boolean;
  updatedAt: string;
  needsSync: boolean;
};

type AlbumProgressState = 'none' | 'in_progress' | 'finished';

type AlbumProgressSummary = {
  completed: number;
  started: number;
  total: number;
  fraction: number;
};

type ProgressServiceEvents = {
  changed: () => void;
  [key: `changed:${string}`]: () => void;
};

export type {
  ProgressEntry,
  AlbumProgressState,
  AlbumProgressSummary,
  ProgressServiceEvents,
};
