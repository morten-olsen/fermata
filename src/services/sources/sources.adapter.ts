import type {
  ArtistRow,
  AlbumRow,
  TrackRow,
  ShowRow,
  EpisodeRow,
  AudiobookRow,
} from "../database/database.schemas";

type ImageSize = 'small' | 'medium' | 'large';

// Fields added by the sync service, not the adapter
type SyncFields = 'id' | 'sourceId' | 'syncedAt';

type Artist = Omit<ArtistRow, SyncFields | 'isFavourite'>;

type Album = Omit<AlbumRow, SyncFields | 'isFavourite'>;

type Track = Omit<TrackRow, SyncFields | 'albumId'> & {
  albumSourceItemId?: string;
};

type Show = Omit<ShowRow, SyncFields>;

type Episode = Omit<EpisodeRow, SyncFields | 'showId'> & {
  showSourceItemId: string;
};

type Audiobook = Omit<AudiobookRow, SyncFields>;

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
