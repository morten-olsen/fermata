import type { SourceRow } from "../../database/database.schemas";
import type { SourceAdapter, Artist, Album, Track, ImageSize } from "../sources.adapter";

import {
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

const createJellyfinAdapter = (source: SourceRow): SourceAdapter => {
  const { baseUrl, userId, accessToken } = source.config;

  return {
    getArtists: async () => {
      const items = await fetchArtists(baseUrl, accessToken, userId);
      return items.map(mapArtist);
    },

    getAlbums: async () => {
      const items = await fetchAlbums(baseUrl, accessToken, userId);
      return items.map(mapAlbum);
    },

    getTracks: async () => {
      const items = await fetchTracks(baseUrl, accessToken, userId);
      return items.map(mapTrack);
    },

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
