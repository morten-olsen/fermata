import { log, warn } from "@/src/shared/lib/log";

import type { Services } from "../services/services";
import { FileSystemService } from "../filesystem/filesystem";

const ARTWORK_DIR = ["downloads", "artwork"];

class ArtworkService {
  #services: Services;
  #cache = new Map<string, string>();

  constructor(services: Services) {
    this.#services = services;
    void this.#scanCache();
  }

  #fs = () => this.#services.get(FileSystemService);

  #key = (sourceId: string, itemId: string, size: string) =>
    `${sourceId}:${itemId}:${size}`;

  #fileName = (sourceId: string, itemId: string, size: string) =>
    `${sourceId}_${itemId}_${size}.jpg`;

  #scanCache = async () => {
    const fs = this.#fs();
    await fs.ensureDir(...ARTWORK_DIR);
    try {
      const files = await fs.listFiles(...ARTWORK_DIR);
      for (const entry of files) {
        if (!entry.name.endsWith(".jpg")) continue;
        const base = entry.name.replace(".jpg", "");
        const parts = base.split("_");
        if (parts.length < 3) continue;
        const size = parts[parts.length - 1];
        const itemId = parts[parts.length - 2];
        const sourceId = parts.slice(0, parts.length - 2).join("_");
        this.#cache.set(this.#key(sourceId, itemId, size), entry.uri);
      }
      log("Artwork cache loaded:", this.#cache.size, "images");
    } catch (e) {
      warn("Failed to scan artwork cache:", e);
    }
  };

  public download = async (
    remoteUrl: string,
    sourceId: string,
    itemId: string,
    size: string,
  ): Promise<string | undefined> => {
    const key = this.#key(sourceId, itemId, size);
    const existing = this.#cache.get(key);
    if (existing) return existing;

    const fs = this.#fs();
    await fs.ensureDir(...ARTWORK_DIR);

    try {
      const name = this.#fileName(sourceId, itemId, size);
      const { uri, status } = await fs.downloadFile(remoteUrl, ...ARTWORK_DIR, name);
      if (status < 200 || status >= 300) return undefined;
      this.#cache.set(key, uri);
      return uri;
    } catch {
      return undefined;
    }
  };

  public resolve = (
    sourceId: string,
    artworkSourceItemId: string | null | undefined,
    size = "medium",
  ): string | undefined => {
    if (!artworkSourceItemId) return undefined;
    return this.#cache.get(this.#key(sourceId, artworkSourceItemId, size));
  };

  public get cacheSize() {
    return this.#cache.size;
  }
}

export { ArtworkService };
