import { File, Directory, Paths } from "expo-file-system";
import * as FileSystem from "expo-file-system";

export interface FsEntry {
  name: string;
  uri: string;
}

/** Resolve a path relative to the document directory. */
function resolveDir(...segments: string[]): Directory {
  return new Directory(Paths.document, ...segments);
}

function resolveFile(...segments: string[]): File {
  // Last segment is the file name, rest form the directory
  return new File(Paths.document, ...segments);
}

export async function ensureDir(...segments: string[]): Promise<void> {
  // Build up directory path incrementally
  for (let i = 1; i <= segments.length; i++) {
    const dir = resolveDir(...segments.slice(0, i));
    if (!dir.exists) dir.create();
  }
}

export async function listFiles(...segments: string[]): Promise<FsEntry[]> {
  const dir = resolveDir(...segments);
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((entry): entry is File => entry instanceof File)
    .map((file) => ({ name: file.name ?? "", uri: file.uri }));
}

export async function deleteDir(...segments: string[]): Promise<void> {
  const dir = resolveDir(...segments);
  if (dir.exists) dir.delete();
}

export async function downloadFile(
  url: string,
  ...destSegments: string[]
): Promise<{ uri: string; size: number; status: number }> {
  const destFile = resolveFile(...destSegments);
  // Use the static method for downloading
  const downloaded = await File.downloadFileAsync(url, destFile);
  return {
    uri: downloaded.uri,
    size: downloaded.size ?? 0,
    status: 200,
  };
}

export async function downloadToUri(
  url: string,
  ...destSegments: string[]
): Promise<{ uri: string; status: number }> {
  const destFile = resolveFile(...destSegments);
  const result = await FileSystem.downloadAsync(url, destFile.uri);
  return { uri: result.uri, status: result.status };
}

export async function fileExists(...segments: string[]): Promise<boolean> {
  const file = resolveFile(...segments);
  return file.exists;
}

export async function deleteFile(...segments: string[]): Promise<void> {
  const file = resolveFile(...segments);
  if (file.exists) file.delete();
}

export function getFileUri(...segments: string[]): string {
  return resolveFile(...segments).uri;
}
