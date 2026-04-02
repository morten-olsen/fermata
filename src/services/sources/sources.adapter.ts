type ImageSize = 'small' | 'medium' | 'large';

type Artist = {
  sourceItemId: string;
  name: string;
  artworkSourceItemId?: string;
};

type Album = {
  sourceItemId: string;
  title: string;
  artistName: string;
  year?: number;
  artworkSourceItemId?: string;
  trackCount?: number;
};

type Track = {
  sourceItemId: string;
  title: string;
  artistName: string;
  albumTitle: string;
  albumSourceItemId?: string;
  duration: number;
  trackNumber?: number;
  discNumber?: number;
  isFavourite?: boolean;
  artworkSourceItemId?: string;
};

type Show = {
  sourceItemId: string;
  title: string;
  authorName?: string;
  description?: string;
  artworkSourceItemId?: string;
  episodeCount?: number;
};

type Episode = {
  sourceItemId: string;
  showSourceItemId: string;
  title: string;
  description?: string;
  duration: number;
  publishedAt?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  contentUrl?: string;
  artworkSourceItemId?: string;
};

type Audiobook = {
  sourceItemId: string;
  title: string;
  authorName: string;
  narratorName?: string;
  description?: string;
  duration: number;
  artworkSourceItemId?: string;
  chapters?: { title: string; startMs: number; endMs: number }[];
};

type SourceAdapter = {
  getArtists(): Promise<Artist[]>;
  getAlbums(): Promise<Album[]>;
  getTracks(): Promise<Track[]>;
  getShows(): Promise<Show[]>;
  getEpisodes(): Promise<Episode[]>;
  getAudiobooks(): Promise<Audiobook[]>;
  getStreamUrl(sourceItemId: string, contentUrl?: string | null): string | Promise<string>;
  getStreamHeaders?(): Record<string, string>;
  getArtworkUrl(itemId: string, size?: ImageSize): string;
};

export type {
  SourceAdapter,
  Artist,
  Album,
  Track,
  Show,
  Episode,
  Audiobook,
  ImageSize,
};
