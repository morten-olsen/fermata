import { File, Directory, Paths } from "expo-file-system";
import * as FileSystem from "expo-file-system";

import { log, warn } from "@/src/shared/lib/log";

const ARTWORK_DIR = new Directory(Paths.document, "downloads", "artwork");

/** In-memory lookup: "sourceId:itemId:size" → local file URI */
const cache = new Map<string, string>();

function cacheKey(
  sourceId: string,
  itemId: string,
  size: string,
): string {
  return `${sourceId}:${itemId}:${size}`;
}

function fileName(
  sourceId: string,
  itemId: string,
  size: string,
): string {
  // Simple, filesystem-safe name
  return `${sourceId}_${itemId}_${size}.jpg`;
}

function ensureDir() {
  try {
    const parent = new Directory(Paths.document, "downloads");
    if (!parent.exists) parent.create();
    if (!ARTWORK_DIR.exists) ARTWORK_DIR.create();
  } catch {
    // Already created
  }
}

/** Load existing cached files into the in-memory lookup on app start */
export function initArtworkCache() {
  ensureDir();
  try {
    const files = ARTWORK_DIR.list();
    for (const entry of files) {
      if (entry instanceof File && entry.name?.endsWith(".jpg")) {
        // Parse "sourceId_itemId_size.jpg" back to cache key
        const base = entry.name.replace(".jpg", "");
        const parts = base.split("_");
        if (parts.length >= 3) {
          const size = parts[parts.length - 1];
          const itemId = parts[parts.length - 2];
          const sourceId = parts.slice(0, parts.length - 2).join("_");
          const key = cacheKey(sourceId, itemId, size);
          cache.set(key, entry.uri);
        }
      }
    }
    log("Artwork cache loaded:", cache.size, "images");
  } catch (e) {
    warn("Failed to scan artwork cache:", e);
  }
}

/** Check if artwork is cached locally. Returns local file URI or undefined. */
export function getCachedArtwork(
  sourceId: string,
  itemId: string,
  size: string,
): string | undefined {
  return cache.get(cacheKey(sourceId, itemId, size));
}

/**
 * Download a single artwork image to local cache.
 * Uses FileSystem.downloadAsync so the network + file I/O runs on the native
 * thread instead of blocking the JS thread.
 * Returns the local file URI on success, undefined on failure.
 */
export async function cacheArtwork(
  remoteUrl: string,
  sourceId: string,
  itemId: string,
  size: string,
): Promise<string | undefined> {
  const key = cacheKey(sourceId, itemId, size);

  // Already cached
  const existing = cache.get(key);
  if (existing) return existing;

  ensureDir();

  try {
    const name = fileName(sourceId, itemId, size);
    const destUri = ARTWORK_DIR.uri + name;

    // downloadAsync runs entirely on the native thread — no JS thread blocking
    const { status } = await FileSystem.downloadAsync(remoteUrl, destUri);
    if (status < 200 || status >= 300) return undefined;

    cache.set(key, destUri);
    return destUri;
  } catch {
    // Download failed — non-fatal, UI will fall back to remote URL
    return undefined;
  }
}

/**
 * Pre-cache artwork for a batch of items during sync.
 * Downloads in sequence to avoid hammering the server.
 * Each item is { sourceId, itemId, remoteUrl }.
 */
export async function prefetchArtwork(
  items: Array<{
    sourceId: string;
    itemId: string;
    remoteUrl: string;
  }>,
  size: string = "medium",
): Promise<number> {
  ensureDir();
  let cached = 0;

  for (const item of items) {
    const key = cacheKey(item.sourceId, item.itemId, size);
    if (cache.has(key)) {
      cached++;
      continue;
    }

    const result = await cacheArtwork(
      item.remoteUrl,
      item.sourceId,
      item.itemId,
      size,
    );
    if (result) cached++;
  }

  return cached;
}

/** Get total number of cached artwork images */
export function getCacheSize(): number {
  return cache.size;
}
