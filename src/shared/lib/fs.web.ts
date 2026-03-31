export interface FsEntry {
  name: string;
  uri: string;
}

// ── OPFS helpers ─────────────────────────────────────────

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

// ── Public API ───────────────────────────────────────────

export async function ensureDir(...segments: string[]): Promise<void> {
  await resolveDir(...segments);
}

export async function listFiles(...segments: string[]): Promise<FsEntry[]> {
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
}

export async function deleteDir(...segments: string[]): Promise<void> {
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
}

export async function downloadFile(
  url: string,
  ...destSegments: string[]
): Promise<{ uri: string; size: number; status: number }> {
  const response = await fetch(url);
  const blob = await response.blob();

  // Write to OPFS
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
}

export async function downloadToUri(
  url: string,
  ...destSegments: string[]
): Promise<{ uri: string; status: number }> {
  const result = await downloadFile(url, ...destSegments);
  return { uri: result.uri, status: result.status };
}

export async function fileExists(...segments: string[]): Promise<boolean> {
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
}

export async function deleteFile(...segments: string[]): Promise<void> {
  const dirSegments = segments.slice(0, -1);
  const fileName = segments[segments.length - 1];
  const dir = await resolveDirIfExists(...dirSegments);
  if (!dir) return;
  try {
    await dir.removeEntry(fileName);
  } catch {
    // File doesn't exist
  }
}

export function getFileUri(...segments: string[]): string {
  // On web, we can't resolve a synchronous URI for an OPFS file.
  // Return a placeholder path — callers should use downloadFile/listFiles
  // which return blob URIs.
  return `opfs:///${segments.join("/")}`;
}
