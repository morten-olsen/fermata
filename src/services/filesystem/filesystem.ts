import { File, Directory, Paths } from "expo-file-system";

import type { FileSystem, FsEntry, DownloadResult } from "./filesystem.types";

function resolveDir(...segments: string[]): Directory {
  return new Directory(Paths.document, ...segments);
}

function resolveFile(...segments: string[]): File {
  return new File(Paths.document, ...segments);
}

class FileSystemService implements FileSystem {
  public ensureDir = (...segments: string[]) => {
    for (let i = 1; i <= segments.length; i++) {
      const dir = resolveDir(...segments.slice(0, i));
      if (!dir.exists) dir.create();
    }
    return Promise.resolve();
  };

  public listFiles = (...segments: string[]): Promise<FsEntry[]> => {
    const dir = resolveDir(...segments);
    if (!dir.exists) return Promise.resolve([]);
    const entries = dir
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .map((file) => ({ name: file.name, uri: file.uri }));
    return Promise.resolve(entries);
  };

  public deleteDir = (...segments: string[]) => {
    const dir = resolveDir(...segments);
    if (dir.exists) dir.delete();
    return Promise.resolve();
  };

  public downloadFile = async (url: string, ...destSegments: string[]): Promise<DownloadResult> => {
    const destFile = resolveFile(...destSegments);
    const downloaded = await File.downloadFileAsync(url, destFile);
    return {
      uri: downloaded.uri,
      size: downloaded.size,
      status: 200,
    };
  };

  public fileExists = (...segments: string[]) => {
    const file = resolveFile(...segments);
    return Promise.resolve(file.exists);
  };

  public deleteFile = (...segments: string[]) => {
    const file = resolveFile(...segments);
    if (file.exists) file.delete();
    return Promise.resolve();
  };

  public getFileUri = (...segments: string[]) => {
    return resolveFile(...segments).uri;
  };

  public getPlayableUrl = (...segments: string[]): Promise<string | null> => {
    const file = resolveFile(...segments);
    return Promise.resolve(file.exists ? file.uri : null);
  };
}

export { FileSystemService };
export type { FileSystem, FsEntry, DownloadResult } from "./filesystem.types";
