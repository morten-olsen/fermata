import type { FileSystem, FsEntry, DownloadResult } from "./filesystem.types";

async function getRoot(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory();
}

async function resolveDir(
  ...segments: string[]
): Promise<FileSystemDirectoryHandle> {
  let handle = await getRoot();
  for (const segment of segments) {
    handle = await handle.getDirectoryHandle(segment, { create: true });
  }
  return handle;
}

async function resolveDirIfExists(
  ...segments: string[]
): Promise<FileSystemDirectoryHandle | null> {
  let handle = await getRoot();
  for (const segment of segments) {
    try {
      handle = await handle.getDirectoryHandle(segment);
    } catch {
      return null;
    }
  }
  return handle;
}

function blobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

class FileSystemService implements FileSystem {
  public ensureDir = async (...segments: string[]) => {
    await resolveDir(...segments);
  };

  public listFiles = async (...segments: string[]): Promise<FsEntry[]> => {
    const dir = await resolveDirIfExists(...segments);
    if (!dir) return [];

    const entries: FsEntry[] = [];
    for await (const [name, handle] of dir as unknown as AsyncIterable<
      [string, FileSystemHandle]
    >) {
      if (handle.kind === "file") {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        entries.push({ name, uri: blobUrl(file) });
      }
    }
    return entries;
  };

  public deleteDir = async (...segments: string[]) => {
    if (segments.length === 0) return;
    const parentSegments = segments.slice(0, -1);
    const dirName = segments[segments.length - 1];
    const parent =
      parentSegments.length > 0
        ? await resolveDirIfExists(...parentSegments)
        : await getRoot();
    if (!parent) return;
    try {
      await parent.removeEntry(dirName, { recursive: true });
    } catch {
      // Directory doesn't exist
    }
  };

  public downloadFile = async (url: string, ...destSegments: string[]): Promise<DownloadResult> => {
    const response = await fetch(url);
    const blob = await response.blob();

    const dirSegments = destSegments.slice(0, -1);
    const fileName = destSegments[destSegments.length - 1];
    const dir = await resolveDir(...dirSegments);
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    return {
      uri: blobUrl(blob),
      size: blob.size,
      status: response.status,
    };
  };

  public fileExists = async (...segments: string[]) => {
    const dirSegments = segments.slice(0, -1);
    const fileName = segments[segments.length - 1];
    const dir = await resolveDirIfExists(...dirSegments);
    if (!dir) return false;
    try {
      await dir.getFileHandle(fileName);
      return true;
    } catch {
      return false;
    }
  };

  public deleteFile = async (...segments: string[]) => {
    const dirSegments = segments.slice(0, -1);
    const fileName = segments[segments.length - 1];
    const dir = await resolveDirIfExists(...dirSegments);
    if (!dir) return;
    try {
      await dir.removeEntry(fileName);
    } catch {
      // File doesn't exist
    }
  };

  public getFileUri = (...segments: string[]) => {
    // Returns a stable URL intercepted by the OPFS service worker.
    // The SW reads the file from OPFS and serves it as a response.
    return `/_opfs/${segments.join("/")}`;
  };

  public getPlayableUrl = async (...segments: string[]): Promise<string | null> => {
    // Use the same stable /_opfs/ URL scheme. The service worker handles
    // reading from OPFS and serving with the correct Content-Type.
    const exists = await this.fileExists(...segments);
    if (!exists) return null;
    return this.getFileUri(...segments);
  };
}

export { FileSystemService };
export type { FileSystem, FsEntry, DownloadResult } from "./filesystem.types";
