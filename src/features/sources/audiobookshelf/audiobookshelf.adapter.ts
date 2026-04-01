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
  getStreamUrl as apiGetStreamUrl,
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
 * Compound sourceItemId format for ABS tracks:
 *   Podcast episodes: "{libraryItemId}\t{episodeId}\t{audioContentUrl}"
 *   Audiobook chapters: "{libraryItemId}\t{chapterId}\t{audioContentUrl}\t{chapterStartSec}"
 *
 * Tab character is used as separator since it can't appear in IDs or file paths.
 * The audioContentUrl is the path served by ABS (e.g. "/s/item/li_xxx/file.mp3").
 * chapterStartSec is the absolute start offset in the book (seconds) — used to
 * convert between ABS absolute book time and Fermata per-chapter relative time.
 */
const SEP = "\t";

function makeCompoundId(
  libraryItemId: string,
  subId: string,
  contentUrl?: string,
  chapterStartSec?: number,
): string {
  const parts = [libraryItemId, subId];
  if (contentUrl) parts.push(contentUrl);
  if (chapterStartSec != null) parts.push(String(chapterStartSec));
  return parts.join(SEP);
}

function parseCompoundId(compoundId: string): {
  libraryItemId: string;
  subId: string;
  contentUrl?: string;
  chapterStartSec?: number;
} {
  const parts = compoundId.split(SEP);
  const startSec = parts[3] ? parseFloat(parts[3]) : undefined;
  return {
    libraryItemId: parts[0],
    subId: parts[1] ?? "",
    contentUrl: parts[2],
    chapterStartSec: startSec != null && !isNaN(startSec) ? startSec : undefined,
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

  getStreamUrl(trackSourceItemId: string): string {
    const { libraryItemId, contentUrl } = parseCompoundId(trackSourceItemId);
    if (contentUrl) {
      // Direct file URL — ABS serves audio at /s/item/{id}/{filename}
      const url = new URL(contentUrl, this.baseUrl);
      url.searchParams.set("token", this.accessToken);
      return url.toString();
    }
    // Fallback for audiobook items (whole-item playback)
    return apiGetStreamUrl(this.baseUrl, libraryItemId, this.accessToken);
  }

  getArtworkUrl(itemId: string, size?: ImageSize): string {
    // Compound IDs (episode/chapter) use the libraryItemId for artwork
    const { libraryItemId } = parseCompoundId(itemId);
    return apiGetArtworkUrl(this.baseUrl, libraryItemId, size);
  }

  getStreamingCapabilities(): SourceStreamingCapabilities {
    return {
      hasNetworkStreamUrl: true,
      hasPublicStreamUrl: false,
    };
  }

  // ── Progress Tracking ─────────────────────────────────

  async reportProgress(
    trackSourceItemId: string,
    positionMs: number,
    durationMs: number,
    isCompleted: boolean,
  ): Promise<void> {
    const { libraryItemId, subId, chapterStartSec } = parseCompoundId(trackSourceItemId);

    if (chapterStartSec != null) {
      // Audiobook chapter: convert chapter-relative position to absolute book time.
      // ABS tracks one progress entry per book, not per chapter.
      const absoluteTimeSec = chapterStartSec + positionMs / 1000;
      // Use 0 for duration — ABS already knows the book duration
      await apiReportProgress(
        this.baseUrl,
        this.accessToken,
        libraryItemId,
        absoluteTimeSec,
        0,
        isCompleted,
      );
    } else {
      // Podcast episode: position is episode-relative, report with episodeId
      const episodeId = subId || undefined;
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
    trackSourceItemIds: string[],
  ): Promise<Map<string, { positionMs: number; durationMs: number; isCompleted: boolean }>> {
    const allProgress = await fetchUserProgress(this.baseUrl, this.accessToken);
    const result = new Map<string, { positionMs: number; durationMs: number; isCompleted: boolean }>();

    // Index progress by libraryItemId (books) and libraryItemId+episodeId (podcasts)
    const progressByItem = new Map<string, typeof allProgress[number]>();
    const progressByEpisode = new Map<string, typeof allProgress[number]>();
    for (const entry of allProgress) {
      if (entry.episodeId) {
        progressByEpisode.set(`${entry.libraryItemId}${SEP}${entry.episodeId}`, entry);
      } else {
        progressByItem.set(entry.libraryItemId, entry);
      }
    }

    for (const sid of trackSourceItemIds) {
      const { libraryItemId, subId, chapterStartSec } = parseCompoundId(sid);

      // Podcast episode: match on libraryItemId + episodeId
      const episodeProgress = progressByEpisode.get(`${libraryItemId}${SEP}${subId}`);
      if (episodeProgress) {
        result.set(sid, {
          positionMs: Math.round(episodeProgress.currentTime * 1000),
          durationMs: Math.round(episodeProgress.duration * 1000),
          isCompleted: episodeProgress.isFinished,
        });
        continue;
      }

      // Audiobook chapter: convert absolute book time to chapter-relative
      if (chapterStartSec != null) {
        const bookProgress = progressByItem.get(libraryItemId);
        if (!bookProgress) continue;

        const absoluteTimeSec = bookProgress.currentTime;
        const chapterRelativeSec = absoluteTimeSec - chapterStartSec;

        if (bookProgress.isFinished || chapterRelativeSec >= 0) {
          // Parse chapter end from the next chapter's start, or treat as completed
          // if the book position is past this chapter's start
          result.set(sid, {
            positionMs: Math.max(0, Math.round(chapterRelativeSec * 1000)),
            durationMs: 0, // chapter duration comes from the track row
            isCompleted: bookProgress.isFinished,
          });
        }
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
      // Build content URL from audioTrack or audioFile path
      const contentUrl = episode.audioTrack?.contentUrl
        ?? `/s/item/${libraryItemId}/${encodeURIComponent(episode.audioFile.metadata.filename)}`;

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
        sourceItemId: makeCompoundId(libraryItemId, episode.id, contentUrl),
        title: episode.title,
        artistName: media.metadata.author || "Unknown Author",
        albumTitle: media.metadata.title,
        albumSourceItemId: libraryItemId,
        duration: episode.duration,
        trackNumber: episode.index,
        episodeNumber: episode.episode ? parseInt(episode.episode, 10) || undefined : undefined,
        publishedAt,
        description: episode.description,
        mediaType: "podcast" as const,
      };
    });
  }

  private mapBookTracks(
    libraryItemId: string,
    media: AbsBookMedia,
  ): Track[] {
    // For audiobooks with chapters, each chapter maps to a track.
    // The stream URL points to the whole book — RNTP/ABS handles seeking to the chapter start.
    // We include the first audio file's path as the content URL.
    const firstAudioPath = media.audioFiles[0]
      ? `/s/item/${libraryItemId}/${encodeURIComponent(media.audioFiles[0].metadata.filename)}`
      : undefined;

    if (media.chapters.length > 0) {
      return media.chapters.map((chapter, idx) => ({
        sourceId: this.id,
        sourceItemId: makeCompoundId(libraryItemId, String(chapter.id), firstAudioPath, chapter.start),
        title: chapter.title,
        artistName: media.metadata.authorName || "Unknown Author",
        albumTitle: media.metadata.title,
        albumSourceItemId: libraryItemId,
        duration: chapter.end - chapter.start,
        trackNumber: idx + 1,
        description: media.metadata.description,
        mediaType: "audiobook" as const,
      }));
    }

    // Fallback: one track per audio file
    return media.audioFiles.map((file) => {
      const contentUrl = `/s/item/${libraryItemId}/${encodeURIComponent(file.metadata.filename)}`;
      return {
        sourceId: this.id,
        sourceItemId: makeCompoundId(libraryItemId, file.ino, contentUrl),
        title: file.metadata.filename.replace(/\.[^.]+$/, ""),
        artistName: media.metadata.authorName || "Unknown Author",
        albumTitle: media.metadata.title,
        albumSourceItemId: libraryItemId,
        duration: file.duration,
        trackNumber: file.index + 1,
        mediaType: "audiobook" as const,
      };
    });
  }
}
