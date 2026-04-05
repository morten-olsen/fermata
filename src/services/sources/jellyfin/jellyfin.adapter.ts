import { AuthExpiredError } from "@/src/shared/lib/errors";

import type { SourceRow } from "../../database/database.schemas";
import type { SourceAdapter, Artist, Album, Track, ImageSize } from "../sources.adapter";
import type { SourceConfig } from "../sources.registry";
import { loadCredentials } from "../sources.credentials";

import {
  authenticate,
  fetchArtists,
  fetchAlbums,
  fetchTracks,
  getStreamUrl as apiGetStreamUrl,
  getArtworkUrl as apiGetArtworkUrl,
  ticksToSeconds,
} from "./jellyfin.api";
import type { JellyfinItem } from "./jellyfin.api";

// ── Mappers ───────────────────────────────────────────

const mapArtist = (item: JellyfinItem): Artist => ({
  sourceItemId: item.Id,
  name: item.Name,
  artworkSourceItemId: item.ImageTags?.Primary ? item.Id : undefined,
});

const mapAlbum = (item: JellyfinItem): Album => ({
  sourceItemId: item.Id,
  title: item.Name,
  artistName:
    item.AlbumArtist
    ?? item.AlbumArtists?.[0]?.Name
    ?? "Unknown Artist",
  year: item.ProductionYear,
  artworkSourceItemId: item.ImageTags?.Primary ? item.Id : undefined,
  trackCount: item.ChildCount,
});

const mapTrack = (item: JellyfinItem): Track => ({
  sourceItemId: item.Id,
  title: item.Name,
  artistName:
    item.Artists?.[0]
    ?? item.ArtistItems?.[0]?.Name
    ?? "Unknown Artist",
  albumTitle: item.Album ?? "Unknown Album",
  albumSourceItemId: item.AlbumId,
  duration: ticksToSeconds(item.RunTimeTicks),
  trackNumber: item.IndexNumber,
  discNumber: item.ParentIndexNumber,
  isFavourite: item.UserData?.IsFavorite ?? false,
});

// ── Adapter ───────────────────────────────────────────

type AdapterOptions = {
  onConfigRefreshed?: (sourceId: string, config: SourceConfig) => void;
};

const createJellyfinAdapter = (
  source: SourceRow,
  options?: AdapterOptions,
): SourceAdapter => {
  const { baseUrl, userId } = source.config;
  let { accessToken } = source.config;

  const refreshAuth = async (): Promise<void> => {
    const creds = await loadCredentials(source.id);
    if (!creds) throw new AuthExpiredError('Jellyfin');
    const result = await authenticate(baseUrl, creds.username, creds.password);
    accessToken = result.accessToken;
    options?.onConfigRefreshed?.(source.id, { baseUrl, userId, accessToken });
  };

  const withRetry = async <T>(fn: (token: string) => Promise<T>): Promise<T> => {
    try {
      return await fn(accessToken);
    } catch (e) {
      if (e instanceof AuthExpiredError) {
        await refreshAuth();
        return fn(accessToken);
      }
      throw e;
    }
  };

  return {
    getArtists: () =>
      withRetry(async (token) => {
        const items = await fetchArtists(baseUrl, token, userId);
        return items.map(mapArtist);
      }),

    getAlbums: () =>
      withRetry(async (token) => {
        const items = await fetchAlbums(baseUrl, token, userId);
        return items.map(mapAlbum);
      }),

    getTracks: () =>
      withRetry(async (token) => {
        const items = await fetchTracks(baseUrl, token, userId);
        return items.map(mapTrack);
      }),

    // Jellyfin doesn't serve podcasts or audiobooks
    getShows: () => Promise.resolve([]),
    getEpisodes: () => Promise.resolve([]),
    getAudiobooks: () => Promise.resolve([]),

    getStreamUrl: (sourceItemId: string) =>
      apiGetStreamUrl(baseUrl, sourceItemId, accessToken),

    getArtworkUrl: (itemId: string, size?: ImageSize) =>
      apiGetArtworkUrl(baseUrl, itemId, size),
  };
};

export { createJellyfinAdapter };
export type { AdapterOptions };
