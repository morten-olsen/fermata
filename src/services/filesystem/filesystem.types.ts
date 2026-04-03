type FsEntry = {
  name: string;
  uri: string;
};

type DownloadResult = {
  uri: string;
  size: number;
  status: number;
};

type FileSystem = {
  ensureDir(...segments: string[]): Promise<void>;
  listFiles(...segments: string[]): Promise<FsEntry[]>;
  deleteDir(...segments: string[]): Promise<void>;
  downloadFile(url: string, ...destSegments: string[]): Promise<DownloadResult>;
  fileExists(...segments: string[]): Promise<boolean>;
  deleteFile(...segments: string[]): Promise<void>;
  getFileUri(...segments: string[]): string;
};

export type { FileSystem, FsEntry, DownloadResult };
