export interface Artist {
  sourceId: string;
  sourceItemId: string;
  name: string;
  artworkSourceItemId?: string; // source-system item ID for artwork resolution
}

export interface Album {
  sourceId: string;
  sourceItemId: string;
  title: string;
  artistName: string;
  year?: number;
  artworkSourceItemId?: string; // source-system item ID for artwork resolution
  trackCount?: number;
}

export interface Track {
  sourceId: string;
  sourceItemId: string;
  title: string;
  artistName: string;
  albumTitle: string;
  albumSourceItemId?: string; // source-system ID of the parent album
  duration: number; // seconds
  trackNumber?: number;
  discNumber?: number;
  isFavourite?: boolean;
}

export interface Playlist {
  sourceId: string;
  sourceItemId: string;
  name: string;
  description?: string;
  artworkSourceItemId?: string;
  trackSourceItemIds: string[]; // ordered track IDs within this playlist
}

export type ImageSize = "small" | "medium" | "large";

export interface SourceStreamingCapabilities {
  /** Source provides HTTP(S) URLs accessible from the local network */
  hasNetworkStreamUrl: boolean;
  /** Source provides URLs accessible from the internet (not just LAN) */
  hasPublicStreamUrl: boolean;
}

export interface SourceConfig {
  baseUrl: string;
  credentials: Record<string, string>;
}

/** Persisted state needed to restore a connection without re-authenticating */
export interface SourcePersistedState {
  baseUrl: string;
  userId: string;
  accessToken: string;
}

export interface SourceAdapter {
  id: string;
  type: string;
  name: string;

  /** Authenticate and establish a new connection */
  connect(config: SourceConfig): Promise<void>;

  /** Restore a previously authenticated connection from persisted state */
  restore(state: SourcePersistedState): void;

  /** Tear down the connection */
  disconnect(): Promise<void>;

  /** Check if the connection is still valid */
  testConnection(): Promise<boolean>;

  /** Get persisted state for storage (call after connect/restore) */
  getPersistedState(): SourcePersistedState;

  getArtists(since?: Date): Promise<Artist[]>;
  getAlbums(since?: Date): Promise<Album[]>;
  getTracks(since?: Date): Promise<Track[]>;
  getPlaylists(): Promise<Playlist[]>;

  getStreamUrl(trackId: string): string;
  getArtworkUrl(itemId: string, size?: ImageSize): string;

  /** Declare what streaming capabilities this source provides */
  getStreamingCapabilities(): SourceStreamingCapabilities;

  /** Toggle favourite status on the remote source. Optional — not all sources support this. */
  toggleFavourite?(sourceItemId: string, isFavourite: boolean): Promise<void>;

  /** Playlist write operations. Optional — not all sources support these. */
  createPlaylist?(name: string, trackSourceItemIds?: string[]): Promise<string>;
  deletePlaylist?(sourceItemId: string): Promise<void>;
  addTracksToPlaylist?(playlistSourceItemId: string, trackSourceItemIds: string[]): Promise<void>;
  removeTracksFromPlaylist?(playlistSourceItemId: string, trackSourceItemIds: string[]): Promise<void>;
}
