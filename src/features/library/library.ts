// Store
export { useLibraryStore } from "./library.store";

// Queries
export {
  getAllArtists,
  getAlbumsByArtist,
  getAllAlbums,
  getAlbum,
  getTracks,
  getTracksByAlbum,
  getTrack,
  setTrackFavourite,
  setAlbumFavourite,
  getFavouriteAlbums,
  getInProgressAlbums,
  searchLibrary,
  getAllPlaylists,
  getAllPlaylistsWithCount,
  getPlaylist,
  getPlaylistTracks,
  getPlaylistsNeedingSync,
  createPlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  markPlaylistSynced,
  getLibraryStats,
} from "./library.queries";

// Context
export { TrackActionsProvider, useTrackActions } from "./components/library.context";

// Components — Music
export { AlbumCard } from "./components/album-card";
export { AlbumGrid } from "./components/album-grid";
export { ArtistRow } from "./components/artist-row";
export { ArtistSectionList } from "./components/artist-section-list";
export { TrackRow } from "./components/track-row";
export { TrackList } from "./components/track-list";
export { PlaylistRow } from "./components/playlist-row";

// Components — Podcasts
export { ShowCard } from "./components/show-card";
export { EpisodeRow } from "./components/episode-row";

// Components — Audiobooks
export { BookCard } from "./components/book-card";
export { ChapterRow } from "./components/chapter-row";
export { BookGrid } from "./components/book-grid";

// Types
export type { TrackActionTarget } from "./track-actions";
export { toActionTarget } from "./track-actions";

// Re-export derived types from the store
export type {
  AlbumRow,
  ArtistRow as ArtistRowType,
  TrackRow as TrackRowType,
  PlaylistRow as PlaylistRowType,
  PlaylistDetail,
  PlaylistTrackRow,
} from "./library.store";
