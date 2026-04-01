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
  fetchArtists,
  fetchAlbums,
  fetchTracks,
  fetchPlaylists,
  fetchPlaylistItems,
  apiCreatePlaylist,
  apiDeletePlaylist,
  apiAddToPlaylist,
  apiRemoveFromPlaylist,
  getStreamUrl as apiGetStreamUrl,
  getArtworkUrl as apiGetArtworkUrl,
  setFavourite,
  ticksToSeconds,
  type JellyfinItem,
} from "./jellyfin.api";

export class JellyfinAdapter implements SourceAdapter {
  id: string;
  type = "jellyfin" as const;
  name: string;

  private baseUrl = "";
  private accessToken = "";
  private userId = "";

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  async connect(config: SourceConfig): Promise<void> {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    const { username, password } = config.credentials;

    const result = await authenticate(this.baseUrl, username, password);
    this.accessToken = result.accessToken;
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
    if (!this.baseUrl || !this.accessToken) return false;
    return apiTestConnection(this.baseUrl, this.accessToken);
  }

  getPersistedState(): SourcePersistedState {
    return {
      baseUrl: this.baseUrl,
      userId: this.userId,
      accessToken: this.accessToken,
    };
  }

  async getArtists(since?: Date): Promise<Artist[]> {
    const items = await fetchArtists(
      this.baseUrl,
      this.accessToken,
      this.userId,
      since
    );
    return items.map((item) => this.mapArtist(item));
  }

  async getAlbums(since?: Date): Promise<Album[]> {
    const items = await fetchAlbums(
      this.baseUrl,
      this.accessToken,
      this.userId,
      since
    );
    return items.map((item) => this.mapAlbum(item));
  }

  async getTracks(since?: Date): Promise<Track[]> {
    const items = await fetchTracks(
      this.baseUrl,
      this.accessToken,
      this.userId,
      since
    );
    return items.map((item) => this.mapTrack(item));
  }

  getStreamUrl(trackId: string): string {
    return apiGetStreamUrl(this.baseUrl, trackId, this.accessToken);
  }

  getArtworkUrl(itemId: string, size?: ImageSize): string {
    return apiGetArtworkUrl(this.baseUrl, itemId, size);
  }

  getStreamingCapabilities(): SourceStreamingCapabilities {
    // Jellyfin stream URLs are network-accessible HTTP(S) endpoints.
    // Whether they're public depends on the user's network config,
    // but they're always LAN-accessible at minimum.
    return {
      hasNetworkStreamUrl: true,
      hasPublicStreamUrl: false, // Conservative — assume LAN only
    };
  }

  async getPlaylists(): Promise<Playlist[]> {
    const items = await fetchPlaylists(
      this.baseUrl,
      this.accessToken,
      this.userId
    );

    const results: Playlist[] = [];
    for (const item of items) {
      const trackItems = await fetchPlaylistItems(
        this.baseUrl,
        this.accessToken,
        item.Id,
        this.userId
      );
      results.push({
        sourceId: this.id,
        sourceItemId: item.Id,
        name: item.Name,
        artworkSourceItemId: item.ImageTags?.Primary ? item.Id : undefined,
        trackSourceItemIds: trackItems
          .filter((t) => t.Type === "Audio")
          .map((t) => t.Id),
      });
    }
    return results;
  }

  async createPlaylist(
    name: string,
    trackSourceItemIds?: string[]
  ): Promise<string> {
    return apiCreatePlaylist(
      this.baseUrl,
      this.accessToken,
      this.userId,
      name,
      trackSourceItemIds
    );
  }

  async deletePlaylist(sourceItemId: string): Promise<void> {
    await apiDeletePlaylist(this.baseUrl, this.accessToken, sourceItemId);
  }

  async addTracksToPlaylist(
    playlistSourceItemId: string,
    trackSourceItemIds: string[]
  ): Promise<void> {
    await apiAddToPlaylist(
      this.baseUrl,
      this.accessToken,
      playlistSourceItemId,
      trackSourceItemIds
    );
  }

  async removeTracksFromPlaylist(
    playlistSourceItemId: string,
    trackSourceItemIds: string[]
  ): Promise<void> {
    await apiRemoveFromPlaylist(
      this.baseUrl,
      this.accessToken,
      playlistSourceItemId,
      trackSourceItemIds
    );
  }

  async toggleFavourite(
    sourceItemId: string,
    isFavourite: boolean
  ): Promise<void> {
    await setFavourite(
      this.baseUrl,
      this.accessToken,
      this.userId,
      sourceItemId,
      isFavourite
    );
  }

  // ── Mappers ──────────────────────────────────────────

  private mapArtist(item: JellyfinItem): Artist {
    return {
      sourceId: this.id,
      sourceItemId: item.Id,
      name: item.Name,
      artworkSourceItemId: item.ImageTags?.Primary ? item.Id : undefined,
    };
  }

  private mapAlbum(item: JellyfinItem): Album {
    return {
      sourceId: this.id,
      sourceItemId: item.Id,
      title: item.Name,
      artistName:
        item.AlbumArtist ??
        item.AlbumArtists?.[0]?.Name ??
        "Unknown Artist",
      year: item.ProductionYear,
      artworkSourceItemId: item.ImageTags?.Primary ? item.Id : undefined,
      trackCount: item.ChildCount,
    };
  }

  private mapTrack(item: JellyfinItem): Track {
    return {
      sourceId: this.id,
      sourceItemId: item.Id,
      title: item.Name,
      artistName:
        item.Artists?.[0] ??
        item.ArtistItems?.[0]?.Name ??
        "Unknown Artist",
      albumTitle: item.Album ?? "Unknown Album",
      albumSourceItemId: item.AlbumId,
      duration: ticksToSeconds(item.RunTimeTicks),
      trackNumber: item.IndexNumber,
      discNumber: item.ParentIndexNumber,
      isFavourite: item.UserData?.IsFavorite ?? false,
    };
  }
}
