import { create } from "zustand";
import {
  getAllAlbums,
  getAllArtists,
  getAlbum,
  getTracks,
  getTrack,
  getAlbumsByArtist,
  getTracksByAlbum,
  searchLibrary,
  getLibraryStats,
  getAllPlaylistsWithCount,
  getPlaylist,
  getPlaylistTracks,
  createPlaylist as dbCreatePlaylist,
  deletePlaylist as dbDeletePlaylist,
  addTrackToPlaylist as dbAddTrackToPlaylist,
  removeTrackFromPlaylist as dbRemoveTrackFromPlaylist,
  setTrackFavourite,
} from "../db/queries";
import type { SourceAdapter } from "../adapters/sources/types";

type AlbumRow = Awaited<ReturnType<typeof getAllAlbums>>[number];
type ArtistRow = Awaited<ReturnType<typeof getAllArtists>>[number];
type TrackRow = Awaited<ReturnType<typeof getTracks>>[number];
type PlaylistRow = Awaited<ReturnType<typeof getAllPlaylistsWithCount>>[number];
type PlaylistDetail = NonNullable<Awaited<ReturnType<typeof getPlaylist>>>;
type PlaylistTrackRow = Awaited<ReturnType<typeof getPlaylistTracks>>[number];

interface LibraryState {
  albums: AlbumRow[];
  artists: ArtistRow[];
  playlists: PlaylistRow[];
  stats: {
    artists: number;
    albums: number;
    tracks: number;
    playlists: number;
    mixTapes: number;
  };
  isLoading: boolean;

  loadAlbums: () => Promise<void>;
  loadArtists: () => Promise<void>;
  loadPlaylists: () => Promise<void>;
  loadStats: () => Promise<void>;
  refreshAll: () => Promise<void>;

  // Detail fetchers
  getAlbum: (id: string) => Promise<AlbumRow | undefined>;
  getAlbumsByArtist: (artistName: string) => Promise<AlbumRow[]>;
  getTracksByAlbum: (albumId: string) => Promise<TrackRow[]>;
  getTracks: (limit?: number, offset?: number) => Promise<TrackRow[]>;
  getPlaylist: (id: string) => Promise<PlaylistDetail | undefined>;
  getPlaylistTracks: (playlistId: string) => Promise<PlaylistTrackRow[]>;

  // Playlist actions
  createPlaylist: (name: string, adapter?: SourceAdapter) => Promise<string>;
  deletePlaylist: (id: string, adapter?: SourceAdapter) => Promise<void>;
  addTrackToPlaylist: (
    playlistId: string,
    trackId: string,
    adapter?: SourceAdapter
  ) => Promise<void>;
  removeTrackFromPlaylist: (
    playlistId: string,
    trackId: string,
    adapter?: SourceAdapter
  ) => Promise<void>;

  // Track actions
  toggleFavourite: (trackId: string) => Promise<boolean>;

  search: (
    query: string
  ) => Promise<{ artists: ArtistRow[]; albums: AlbumRow[]; tracks: TrackRow[] }>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  albums: [],
  artists: [],
  playlists: [],
  stats: { artists: 0, albums: 0, tracks: 0, playlists: 0, mixTapes: 0 },
  isLoading: false,

  loadAlbums: async () => {
    const albums = await getAllAlbums();
    set({ albums });
  },

  loadArtists: async () => {
    const artists = await getAllArtists();
    set({ artists });
  },

  loadPlaylists: async () => {
    const playlists = await getAllPlaylistsWithCount();
    set({ playlists });
  },

  loadStats: async () => {
    const stats = await getLibraryStats();
    set({ stats });
  },

  refreshAll: async () => {
    set({ isLoading: true });
    try {
      const [albums, artists, playlists, stats] = await Promise.all([
        getAllAlbums(),
        getAllArtists(),
        getAllPlaylistsWithCount(),
        getLibraryStats(),
      ]);
      set({ albums, artists, playlists, stats });
    } finally {
      set({ isLoading: false });
    }
  },

  // Detail fetchers
  getAlbum: (id) => getAlbum(id),
  getAlbumsByArtist: (artistName) => getAlbumsByArtist(artistName),
  getTracksByAlbum: (albumId) => getTracksByAlbum(albumId),
  getTracks: (limit, offset) => getTracks(limit, offset),
  getPlaylist: (id) => getPlaylist(id),
  getPlaylistTracks: (playlistId) => getPlaylistTracks(playlistId),

  // Playlist actions
  createPlaylist: async (name, adapter) => {
    let id: string;
    if (adapter?.createPlaylist) {
      const sourceItemId = await adapter.createPlaylist(name);
      id = await dbCreatePlaylist(name, adapter.id, sourceItemId);
    } else {
      id = await dbCreatePlaylist(name);
    }
    await get().loadPlaylists();
    await get().loadStats();
    return id;
  },

  deletePlaylist: async (id, adapter) => {
    const playlist = await getPlaylist(id);
    if (playlist?.sourceItemId && adapter?.deletePlaylist) {
      await adapter.deletePlaylist(playlist.sourceItemId);
    }
    await dbDeletePlaylist(id);
    await Promise.all([get().loadPlaylists(), get().loadStats()]);
  },

  addTrackToPlaylist: async (playlistId, trackId, adapter) => {
    await dbAddTrackToPlaylist(playlistId, trackId);

    const playlist = await getPlaylist(playlistId);
    if (playlist?.sourceItemId && adapter?.addTracksToPlaylist) {
      const track = await getTrack(trackId);
      if (track) {
        try {
          await adapter.addTracksToPlaylist(playlist.sourceItemId, [
            track.sourceItemId,
          ]);
        } catch {
          // Offline — needsSync already set
        }
      }
    }
    await get().loadPlaylists();
  },

  removeTrackFromPlaylist: async (playlistId, trackId, adapter) => {
    const playlist = await getPlaylist(playlistId);
    if (playlist?.sourceItemId && adapter?.removeTracksFromPlaylist) {
      const track = await getTrack(trackId);
      if (track) {
        try {
          await adapter.removeTracksFromPlaylist(playlist.sourceItemId, [
            track.sourceItemId,
          ]);
        } catch {
          // Offline — needsSync will be set
        }
      }
    }
    await dbRemoveTrackFromPlaylist(playlistId, trackId);
    await get().loadPlaylists();
  },

  // Track actions
  toggleFavourite: async (trackId: string) => {
    const track = await getTrack(trackId);
    if (!track) return false;
    const newValue = !track.isFavourite;
    await setTrackFavourite(trackId, newValue);
    return newValue;
  },

  search: (query) => searchLibrary(query),
}));

export type {
  AlbumRow,
  ArtistRow,
  TrackRow,
  PlaylistRow,
  PlaylistDetail,
  PlaylistTrackRow,
};
