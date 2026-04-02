import type { SourceRow } from "../../database/database.schemas";
import type { SourceAdapter, Artist, Show, Episode, Audiobook, ImageSize } from "../sources.adapter";

import {
  fetchLibraries,
  fetchAllLibraryItems,
  startPlaySession,
  getArtworkUrl as apiGetArtworkUrl,
} from "./audiobookshelf.api";
import type { AbsLibraryItem, AbsPodcastMedia, AbsBookMedia } from "./audiobookshelf.types";
import { isBookMedia, isPodcastMedia } from "./audiobookshelf.types";

// ── Helpers ───────────────────────────────────────────

const makeSourceItemId = (libraryItemId: string, subId: string): string =>
  `${libraryItemId}:${subId}`;

const splitSourceItemId = (sourceItemId: string) => {
  const idx = sourceItemId.indexOf(":");
  if (idx === -1) return { libraryItemId: sourceItemId, subId: "" };
  return {
    libraryItemId: sourceItemId.substring(0, idx),
    subId: sourceItemId.substring(idx + 1),
  };
};

const extractAuthorName = (item: AbsLibraryItem): string => {
  if (isBookMedia(item)) return item.media.metadata.authorName || "Unknown Author";
  if (isPodcastMedia(item)) return item.media.metadata.author || "Unknown Author";
  return "Unknown Author";
};

// ── Mappers ───────────────────────────────────────────

const mapShow = (item: AbsLibraryItem & { media: AbsPodcastMedia }): Show => ({
  sourceItemId: item.id,
  title: item.media.metadata.title,
  authorName: item.media.metadata.author,
  description: item.media.metadata.description,
  artworkSourceItemId: item.id,
  episodeCount: item.media.episodes.length,
});

const mapEpisodes = (item: AbsLibraryItem & { media: AbsPodcastMedia }): Episode[] =>
  item.media.episodes.map((ep) => {
    const contentUrl = ep.audioTrack?.contentUrl
      ?? `/s/item/${item.id}/${ep.audioFile.metadata.filename}`;

    let publishedAt: string | undefined;
    if (ep.publishedAt) {
      publishedAt = new Date(ep.publishedAt).toISOString();
    } else if (ep.pubDate) {
      const parsed = new Date(ep.pubDate);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed.toISOString();
      }
    }

    return {
      sourceItemId: makeSourceItemId(item.id, ep.id),
      showSourceItemId: item.id,
      title: ep.title,
      description: ep.description,
      duration: ep.duration,
      publishedAt,
      episodeNumber: ep.episode ? parseInt(ep.episode, 10) || undefined : undefined,
      seasonNumber: ep.season ? parseInt(ep.season, 10) || undefined : undefined,
      contentUrl,
      artworkSourceItemId: item.id,
    };
  });

const mapAudiobook = (item: AbsLibraryItem & { media: AbsBookMedia }): Audiobook => ({
  sourceItemId: item.id,
  title: item.media.metadata.title,
  authorName: item.media.metadata.authorName || "Unknown Author",
  narratorName: item.media.metadata.narratorName,
  description: item.media.metadata.description,
  duration: item.media.duration,
  artworkSourceItemId: item.id,
  chapters: item.media.chapters.map((ch) => ({
    title: ch.title,
    startMs: Math.round(ch.start * 1000),
    endMs: Math.round(ch.end * 1000),
  })),
});

// ── Adapter ───────────────────────────────────────────

const createAudiobookshelfAdapter = (source: SourceRow): SourceAdapter => {
  const { baseUrl, accessToken } = source.config;

  let cachedItems: AbsLibraryItem[] | null = null;

  const fetchAllItems = async (): Promise<AbsLibraryItem[]> => {
    if (cachedItems) return cachedItems;

    const libraries = await fetchLibraries(baseUrl, accessToken);
    const allItems: AbsLibraryItem[] = [];

    for (const library of libraries) {
      const items = await fetchAllLibraryItems(baseUrl, accessToken, library.id);
      allItems.push(...items);
    }

    cachedItems = allItems;
    return allItems;
  };

  return {
    // ABS doesn't have a dedicated artist entity — synthesize from items
    getArtists: async (): Promise<Artist[]> => {
      const items = await fetchAllItems();
      const seen = new Map<string, Artist>();

      for (const item of items) {
        const name = extractAuthorName(item);
        if (!seen.has(name)) {
          seen.set(name, {
            sourceItemId: `author:${name}`,
            name,
            artworkSourceItemId: item.id,
          });
        }
      }

      return [...seen.values()];
    },

    // ABS doesn't have music albums
    getAlbums: () => Promise.resolve([]),
    getTracks: () => Promise.resolve([]),

    getShows: async () => {
      const items = await fetchAllItems();
      return items.filter(isPodcastMedia).map(mapShow);
    },

    getEpisodes: async () => {
      const items = await fetchAllItems();
      return items.filter(isPodcastMedia).flatMap(mapEpisodes);
    },

    getAudiobooks: async () => {
      const items = await fetchAllItems();
      return items.filter(isBookMedia).map(mapAudiobook);
    },

    getStreamUrl: async (sourceItemId: string, contentUrl?: string | null) => {
      if (contentUrl) {
        const url = new URL(contentUrl, baseUrl);
        url.searchParams.set("token", accessToken);
        return url.toString();
      }
      const { libraryItemId } = splitSourceItemId(sourceItemId);
      return startPlaySession(baseUrl, accessToken, libraryItemId);
    },

    getStreamHeaders: () => ({ Authorization: `Bearer ${accessToken}` }),

    getArtworkUrl: (itemId: string, size?: ImageSize) =>
      apiGetArtworkUrl(baseUrl, itemId, size),
  };
};

export { createAudiobookshelfAdapter, splitSourceItemId };
