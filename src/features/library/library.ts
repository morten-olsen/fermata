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
export { AlbumCard } from "@/src/components/media/album-card";
export { AlbumGrid } from "@/src/components/media/album-grid";
export { ArtistRow } from "@/src/components/media/artist-row";
export { ArtistSectionList } from "@/src/components/media/artist-section-list";
export { TrackRow } from "@/src/components/media/track-row";
export { TrackList } from "@/src/components/media/track-list";
export { PlaylistRow } from "@/src/components/media/playlist-row";

// Components — Podcasts
export { ShowCard } from "@/src/components/media/show-card";
export { EpisodeRow } from "@/src/components/media/episode-row";

// Components — Audiobooks
export { BookCard } from "@/src/components/media/book-card";
export { ChapterRow } from "@/src/components/media/chapter-row";
export { BookGrid } from "@/src/components/media/book-grid";

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
