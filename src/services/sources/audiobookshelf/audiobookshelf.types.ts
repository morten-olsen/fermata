// ── Authentication ─────────────────────────────────────

type AbsLoginResponse = {
  user: {
    id: string;
    username: string;
    token: string;
  };
};

// ── Libraries ──────────────────────────────────────────

type AbsLibrary = {
  id: string;
  name: string;
  mediaType: "book" | "podcast";
  folders: { id: string; fullPath: string }[];
};

type AbsLibrariesResponse = {
  libraries: AbsLibrary[];
};

// ── Library Items ──────────────────────────────────────

type AbsLibraryItemsResponse = {
  results: AbsLibraryItem[];
  total: number;
  limit: number;
  page: number;
};

type AbsLibraryItem = {
  id: string;
  ino: string;
  libraryId: string;
  mediaType: "book" | "podcast";
  media: AbsBookMedia | AbsPodcastMedia;
};

// ── Book Media ─────────────────────────────────────────

type AbsBookMedia = {
  metadata: AbsBookMetadata;
  audioFiles: AbsAudioFile[];
  chapters: AbsChapter[];
  duration: number;
};

type AbsBookMetadata = {
  title: string;
  subtitle?: string;
  authors: { id: string; name: string }[];
  narrators?: string[];
  authorName: string;
  narratorName?: string;
  description?: string;
  publishedYear?: string;
  language?: string;
};

type AbsAudioFile = {
  index: number;
  ino: string;
  relPath?: string;
  metadata: {
    filename: string;
    ext: string;
    path: string;
    relPath?: string;
    size: number;
  };
  duration: number;
};

type AbsChapter = {
  id: number;
  start: number;
  end: number;
  title: string;
};

// ── Podcast Media ──────────────────────────────────────

type AbsPodcastMedia = {
  metadata: AbsPodcastMetadata;
  episodes: AbsPodcastEpisode[];
};

type AbsPodcastMetadata = {
  title: string;
  author?: string;
  description?: string;
  language?: string;
};

type AbsPodcastEpisode = {
  id: string;
  libraryItemId: string;
  index: number;
  title: string;
  description?: string;
  pubDate?: string;
  episode?: string;
  season?: string;
  episodeType?: string;
  audioFile: AbsAudioFile;
  audioTrack?: {
    contentUrl: string;
    mimeType: string;
  };
  duration: number;
  publishedAt?: number;
};

// ── Playback Progress ──────────────────────────────────

type AbsMediaProgress = {
  id: string;
  libraryItemId: string;
  episodeId?: string;
  duration: number;
  currentTime: number;
  progress: number;
  isFinished: boolean;
  lastUpdate: number;
};

// ── Type Guards ────────────────────────────────────────

const isBookMedia = (
  item: AbsLibraryItem,
): item is AbsLibraryItem & { media: AbsBookMedia } =>
  item.mediaType === "book" && (item.media as AbsBookMedia).audioFiles.length > 0;

const isPodcastMedia = (
  item: AbsLibraryItem,
): item is AbsLibraryItem & { media: AbsPodcastMedia } =>
  item.mediaType === "podcast";

export type {
  AbsLoginResponse,
  AbsLibrary,
  AbsLibrariesResponse,
  AbsLibraryItem,
  AbsLibraryItemsResponse,
  AbsBookMedia,
  AbsBookMetadata,
  AbsAudioFile,
  AbsChapter,
  AbsPodcastMedia,
  AbsPodcastMetadata,
  AbsPodcastEpisode,
  AbsMediaProgress,
};
export { isBookMedia, isPodcastMedia };
