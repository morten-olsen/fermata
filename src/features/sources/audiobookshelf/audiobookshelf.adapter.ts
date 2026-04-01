import { log, warn } from "@/src/shared/lib/log";

import type {
  SourceAdapter,
  SourceConfig,
  SourcePersistedState,
  SourceStreamingCapabilities,
  Artist,
  Album,
  Track,
  Playlist,
  ImageSize,
} from "../sources.types";

import {
  authenticate,
  testConnection as apiTestConnection,
  fetchLibraries,
  fetchAllLibraryItems,
  startPlaySession,
  getArtworkUrl as apiGetArtworkUrl,
  reportProgress as apiReportProgress,
  fetchUserProgress,
} from "./audiobookshelf.api";
import type {
  AbsLibraryItem,
  AbsBookMedia,
  AbsPodcastMedia,
  AbsPodcastEpisode,
} from "./audiobookshelf.types";
import { isBookMedia, isPodcastMedia } from "./audiobookshelf.types";

/**
 * sourceItemId format for ABS tracks: "{libraryItemId}:{subId}"
 *
 * subId is episodeId for podcasts, chapterId for audiobook chapters,
 * or file ino for audiobook fallback (one track per audio file).
 *
 * Additional fields (contentUrl, chapterStartMs) are stored as
 * separate columns on the tracks table — not packed into the ID.
 */

function makeSourceItemId(libraryItemId: string, subId: string): string {
  return `${libraryItemId}:${subId}`;
}

function splitSourceItemId(sourceItemId: string): {
  libraryItemId: string;
  subId: string;
} {
  const idx = sourceItemId.indexOf(":");
  if (idx === -1) return { libraryItemId: sourceItemId, subId: "" };
  return {
    libraryItemId: sourceItemId.substring(0, idx),
    subId: sourceItemId.substring(idx + 1),
  };
}

export class AudiobookshelfAdapter implements SourceAdapter {
  id: string;
  type = "audiobookshelf" as const;
  name: string;

  private baseUrl = "";
  private accessToken = "";
  private userId = "";

  /** Cached items for the current sync cycle to avoid repeated fetches */
  private cachedItems: AbsLibraryItem[] | null = null;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  async connect(config: SourceConfig): Promise<void> {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    const { username, password } = config.credentials;

    const result = await authenticate(this.baseUrl, username, password);
    this.accessToken = result.token;
    this.userId = result.userId;
  }

  restore(state: SourcePersistedState): void {
    this.baseUrl = state.baseUrl.replace(/\/$/, "");
    this.userId = state.userId;
    this.accessToken = state.accessToken;
  }

  async disconnect(): Promise<void> {
    await Promise.resolve();
    this.accessToken = "";
    this.userId = "";
  }

  async testConnection(): Promise<boolean> {
    if (!this.baseUrl) return false;
    return apiTestConnection(this.baseUrl);
  }

  getPersistedState(): SourcePersistedState {
    return {
      baseUrl: this.baseUrl,
      userId: this.userId,
      accessToken: this.accessToken,
    };
  }

  // ── Library Sync ──────────────────────────────────────

  async getArtists(): Promise<Artist[]> {
    const items = await this.fetchAllItems();
    log("ABS getArtists: fetched", items.length, "items");

    const artistMap = new Map<string, Artist>();

    for (const item of items) {
      const authorName = this.extractAuthorName(item);
      if (!authorName || artistMap.has(authorName)) continue;

      artistMap.set(authorName, {
        sourceId: this.id,
        sourceItemId: `author:${authorName}`,
        name: authorName,
        // No dedicated author artwork in ABS — use first item's cover
        artworkSourceItemId: item.id,
      });
    }

    return [...artistMap.values()];
  }

  async getAlbums(): Promise<Album[]> {
    const items = await this.fetchAllItems();
    const albums = items.map((item) => this.mapAlbum(item));
    log("ABS getAlbums:", albums.length, "albums —", albums.map((a) => `${a.title} [${a.mediaType}]`).join(", "));
    return albums;
  }

  async getTracks(): Promise<Track[]> {
    const items = await this.fetchAllItems();
    const allTracks: Track[] = [];

    for (const item of items) {
      log("ABS getTracks: item", item.id, "mediaType:", item.mediaType, "keys:", Object.keys(item.media));
      if (isPodcastMedia(item)) {
        const episodes = this.mapPodcastEpisodes(item.id, item.media);
        log("ABS getTracks: podcast", item.id, "→", episodes.length, "episodes");
        allTracks.push(...episodes);
      } else if (isBookMedia(item)) {
        const chapters = this.mapBookTracks(item.id, item.media);
        log("ABS getTracks: book", item.id, "→", chapters.length, "chapters");
        allTracks.push(...chapters);
      } else {
        warn("ABS getTracks: unknown mediaType for item", item.id, ":", item.mediaType);
      }
    }

    log("ABS getTracks: total", allTracks.length, "tracks");
    return allTracks;
  }

  getPlaylists(): Promise<Playlist[]> {
    // ABS playlists are a different concept — not synced for now.
    // Clear item cache since this is the last method called during sync.
    this.clearCache();
    return Promise.resolve([]);
  }

  // ── Streaming & Artwork ───────────────────────────────

  async getStreamUrl(sourceItemId: string, contentUrl?: string | null): Promise<string> {
    if (contentUrl) {
      // Podcast episodes have a direct contentUrl from the API
      const url = new URL(contentUrl, this.baseUrl);
      url.searchParams.set("token", this.accessToken);
      return url.toString();
    }
    // Audiobooks: start a play session — ABS serves audio properly through
    // this API (the static /s/item/ endpoint is unreliable for large files).
    const { libraryItemId } = splitSourceItemId(sourceItemId);
    return startPlaySession(this.baseUrl, this.accessToken, libraryItemId);
  }

  getStreamHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  getArtworkUrl(itemId: string, size?: ImageSize): string {
    return apiGetArtworkUrl(this.baseUrl, itemId, size);
  }

  getStreamingCapabilities(): SourceStreamingCapabilities {
    return {
      hasNetworkStreamUrl: true,
      hasPublicStreamUrl: false,
    };
  }

  // ── Progress Tracking ─────────────────────────────────

  async reportProgress(
    sourceItemId: string,
    positionMs: number,
    durationMs: number,
    isCompleted: boolean,
    chapterStartMs?: number,
  ): Promise<void> {
    const { libraryItemId, subId } = splitSourceItemId(sourceItemId);

    if (chapterStartMs != null) {
      // Legacy chapter-based audiobook track: convert chapter-relative position
      // to absolute book time. ABS tracks one progress entry per book.
      const absoluteTimeSec = chapterStartMs / 1000 + positionMs / 1000;
      await apiReportProgress(
        this.baseUrl,
        this.accessToken,
        libraryItemId,
        absoluteTimeSec,
        0,
        isCompleted,
      );
    } else {
      // Podcast episode or audiobook file track.
      // Podcast episode IDs are non-numeric strings; audiobook file inos are numeric.
      // For audiobook files, report at book level (no episodeId).
      const episodeId = subId && !/^\d+$/.test(subId) ? subId : undefined;
      await apiReportProgress(
        this.baseUrl,
        this.accessToken,
        libraryItemId,
        positionMs / 1000,
        durationMs / 1000,
        isCompleted,
        episodeId,
      );
    }
  }

  async getProgress(
    trackDescriptors: Array<{ sourceItemId: string; chapterStartMs?: number }>,
  ): Promise<Map<string, { positionMs: number; durationMs: number; isCompleted: boolean }>> {
    const allProgress = await fetchUserProgress(this.baseUrl, this.accessToken);
    const result = new Map<string, { positionMs: number; durationMs: number; isCompleted: boolean }>();

    // Index progress by libraryItemId (books) and libraryItemId+episodeId (podcasts)
    const progressByItem = new Map<string, typeof allProgress[number]>();
    const progressByEpisode = new Map<string, typeof allProgress[number]>();
    for (const entry of allProgress) {
      if (entry.episodeId) {
        progressByEpisode.set(`${entry.libraryItemId}:${entry.episodeId}`, entry);
      } else {
        progressByItem.set(entry.libraryItemId, entry);
      }
    }

    for (const { sourceItemId, chapterStartMs } of trackDescriptors) {
      const { libraryItemId, subId } = splitSourceItemId(sourceItemId);

      // Podcast episode: match on libraryItemId + episodeId
      const episodeProgress = progressByEpisode.get(`${libraryItemId}:${subId}`);
      if (episodeProgress) {
        result.set(sourceItemId, {
          positionMs: Math.round(episodeProgress.currentTime * 1000),
          durationMs: Math.round(episodeProgress.duration * 1000),
          isCompleted: episodeProgress.isFinished,
        });
        continue;
      }

      // Legacy audiobook chapter: convert absolute book time to chapter-relative
      if (chapterStartMs != null) {
        const bookProgress = progressByItem.get(libraryItemId);
        if (!bookProgress) continue;

        const absoluteTimeMs = bookProgress.currentTime * 1000;
        const chapterRelativeMs = absoluteTimeMs - chapterStartMs;

        if (bookProgress.isFinished || chapterRelativeMs >= 0) {
          result.set(sourceItemId, {
            positionMs: Math.max(0, Math.round(chapterRelativeMs)),
            durationMs: 0, // chapter duration comes from the track row
            isCompleted: bookProgress.isFinished,
          });
        }
        continue;
      }

      // Audiobook file track: use book-level progress directly
      const bookProgress = progressByItem.get(libraryItemId);
      if (bookProgress) {
        result.set(sourceItemId, {
          positionMs: Math.round(bookProgress.currentTime * 1000),
          durationMs: Math.round(bookProgress.duration * 1000),
          isCompleted: bookProgress.isFinished,
        });
      }
    }

    return result;
  }

  // ── Private Helpers ───────────────────────────────────

  /**
   * Fetch all items from all libraries. Results are cached for the sync cycle
   * since getArtists/getAlbums/getTracks are called sequentially on the same data.
   */
  private async fetchAllItems(): Promise<AbsLibraryItem[]> {
    if (this.cachedItems) return this.cachedItems;

    const libraries = await fetchLibraries(this.baseUrl, this.accessToken);
    const allItems: AbsLibraryItem[] = [];

    for (const library of libraries) {
      const items = await fetchAllLibraryItems(
        this.baseUrl,
        this.accessToken,
        library.id,
      );
      allItems.push(...items);
    }

    this.cachedItems = allItems;
    return allItems;
  }

  private clearCache(): void {
    this.cachedItems = null;
  }

  private extractAuthorName(item: AbsLibraryItem): string {
    if (isBookMedia(item)) {
      return item.media.metadata.authorName || "Unknown Author";
    }
    if (isPodcastMedia(item)) {
      return item.media.metadata.author || "Unknown Author";
    }
    return "Unknown Author";
  }

  private mapAlbum(item: AbsLibraryItem): Album {
    if (isBookMedia(item)) {
      return {
        sourceId: this.id,
        sourceItemId: item.id,
        title: item.media.metadata.title,
        artistName: item.media.metadata.authorName || "Unknown Author",
        year: item.media.metadata.publishedYear
          ? parseInt(item.media.metadata.publishedYear, 10) || undefined
          : undefined,
        artworkSourceItemId: item.id,
        trackCount: item.media.audioFiles.length,
        mediaType: "audiobook",
        chapters: item.media.chapters.map((ch) => ({
          title: ch.title,
          start: ch.start,
          end: ch.end,
        })),
      };
    }

    if (isPodcastMedia(item)) {
      return {
        sourceId: this.id,
        sourceItemId: item.id,
        title: item.media.metadata.title,
        artistName: item.media.metadata.author || "Unknown Author",
        artworkSourceItemId: item.id,
        trackCount: item.media.episodes.length,
        mediaType: "podcast",
      };
    }

    // Fallback — shouldn't happen
    return {
      sourceId: this.id,
      sourceItemId: item.id,
      title: "Unknown",
      artistName: "Unknown",
      mediaType: "audiobook",
    };
  }

  private mapPodcastEpisodes(
    libraryItemId: string,
    media: AbsPodcastMedia,
  ): Track[] {
    return media.episodes.map((episode: AbsPodcastEpisode) => {
      // Build content URL from audioTrack (preferred) or audioFile path
      const contentUrl = episode.audioTrack?.contentUrl
        ?? `/s/item/${libraryItemId}/${episode.audioFile.metadata.filename}`;

      // Normalize publishedAt to ISO — prefer the unix timestamp, fall back to parsing pubDate
      let publishedAt: string | undefined;
      if (episode.publishedAt) {
        publishedAt = new Date(episode.publishedAt).toISOString();
      } else if (episode.pubDate) {
        const parsed = new Date(episode.pubDate);
        if (!isNaN(parsed.getTime())) {
          publishedAt = parsed.toISOString();
        }
      }

      return {
        sourceId: this.id,
        sourceItemId: makeSourceItemId(libraryItemId, episode.id),
        title: episode.title,
        artistName: media.metadata.author || "Unknown Author",
        albumTitle: media.metadata.title,
        albumSourceItemId: libraryItemId,
        duration: episode.duration,
        trackNumber: episode.index,
        episodeNumber: episode.episode ? parseInt(episode.episode, 10) || undefined : undefined,
        publishedAt,
        description: episode.description,
        contentUrl,
        artworkSourceItemId: libraryItemId,
        mediaType: "podcast" as const,
      };
    });
  }

  private mapBookTracks(
    libraryItemId: string,
    media: AbsBookMedia,
  ): Track[] {
    // No contentUrl — audiobooks stream via the play session API (HLS).
    // The /s/item/ direct file endpoint is unreliable for large files.
    return media.audioFiles.map((file) => ({
      sourceId: this.id,
      sourceItemId: makeSourceItemId(libraryItemId, file.ino),
      title: media.audioFiles.length === 1
        ? media.metadata.title
        : `${media.metadata.title} — Part ${file.index + 1}`,
      artistName: media.metadata.authorName || "Unknown Author",
      albumTitle: media.metadata.title,
      albumSourceItemId: libraryItemId,
      duration: file.duration,
      trackNumber: file.index + 1,
      artworkSourceItemId: libraryItemId,
      mediaType: "audiobook" as const,
    }));
  }
}
