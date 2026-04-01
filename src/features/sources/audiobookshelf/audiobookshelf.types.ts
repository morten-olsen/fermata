// ── Authentication ─────────────────────────────────────

export interface AbsLoginResponse {
  user: {
    id: string;
    username: string;
    token: string;
  };
}

// ── Libraries ──────────────────────────────────────────

export interface AbsLibrary {
  id: string;
  name: string;
  mediaType: "book" | "podcast";
  folders: { id: string; fullPath: string }[];
}

export interface AbsLibrariesResponse {
  libraries: AbsLibrary[];
}

// ── Library Items ──────────────────────────────────────

export interface AbsLibraryItemsResponse {
  results: AbsLibraryItem[];
  total: number;
  limit: number;
  page: number;
}

export interface AbsLibraryItem {
  id: string;
  ino: string;
  libraryId: string;
  mediaType: "book" | "podcast";
  media: AbsBookMedia | AbsPodcastMedia;
}

// ── Book Media ─────────────────────────────────────────

export interface AbsBookMedia {
  metadata: AbsBookMetadata;
  audioFiles: AbsAudioFile[];
  chapters: AbsChapter[];
  duration: number;
}

export interface AbsBookMetadata {
  title: string;
  subtitle?: string;
  authors: { id: string; name: string }[];
  narrators?: string[];
  authorName: string; // computed convenience field (comma-separated)
  narratorName?: string;
  description?: string;
  publishedYear?: string;
  language?: string;
}

export interface AbsAudioFile {
  index: number;
  ino: string;
  relPath?: string; // path relative to item folder (may differ from filename)
  metadata: {
    filename: string;
    ext: string;
    path: string;
    relPath?: string;
    size: number;
  };
  duration: number;
}

export interface AbsChapter {
  id: number;
  start: number;
  end: number;
  title: string;
}

// ── Podcast Media ──────────────────────────────────────

export interface AbsPodcastMedia {
  metadata: AbsPodcastMetadata;
  episodes: AbsPodcastEpisode[];
}

export interface AbsPodcastMetadata {
  title: string;
  author?: string;
  description?: string;
  language?: string;
}

export interface AbsPodcastEpisode {
  id: string;
  libraryItemId: string;
  index: number;
  title: string;
  description?: string;
  pubDate?: string;
  episode?: string; // string episode number (e.g., "1", "2")
  season?: string;
  episodeType?: string; // "full" | "trailer" | "bonus"
  audioFile: AbsAudioFile;
  audioTrack?: {
    contentUrl: string; // e.g. "/s/item/li_xxx/1 - Pilot.mp3"
    mimeType: string;
  };
  duration: number;
  publishedAt?: number; // unix timestamp ms
}

// ── Playback Progress ──────────────────────────────────

export interface AbsMediaProgress {
  id: string;
  libraryItemId: string;
  episodeId?: string;
  duration: number; // seconds
  currentTime: number; // seconds
  progress: number; // 0–1
  isFinished: boolean;
  lastUpdate: number; // unix timestamp ms
}

// ── Type Guards ────────────────────────────────────────

export function isBookMedia(
  item: AbsLibraryItem,
): item is AbsLibraryItem & { media: AbsBookMedia } {
  return item.mediaType === "book";
}

export function isPodcastMedia(
  item: AbsLibraryItem,
): item is AbsLibraryItem & { media: AbsPodcastMedia } {
  return item.mediaType === "podcast";
}
