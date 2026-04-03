import { fetchWithTimeout } from "@/src/shared/lib/fetch";

const CLIENT_NAME = "Fermata";
const CLIENT_VERSION = "0.1.0";
const DEVICE_NAME = "Fermata Mobile";

function getDeviceId(): string {
  // TODO: use expo-secure-store to persist a unique device ID
  return "fermata-device-001";
}

function buildAuthHeader(accessToken?: string): string {
  const parts = [
    `Client="${CLIENT_NAME}"`,
    `Device="${DEVICE_NAME}"`,
    `DeviceId="${getDeviceId()}"`,
    `Version="${CLIENT_VERSION}"`,
  ];
  if (accessToken) {
    parts.push(`Token="${accessToken}"`);
  }
  return `MediaBrowser ${parts.join(", ")}`;
}

// ── Types ─────────────────────────────────────────────

type JellyfinItem = {
  Id: string;
  Name: string;
  Type: string;
  AlbumArtist?: string;
  AlbumArtists?: { Name: string; Id: string }[];
  Artists?: string[];
  ArtistItems?: { Name: string; Id: string }[];
  Album?: string;
  AlbumId?: string;
  ProductionYear?: number;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  RunTimeTicks?: number;
  ChildCount?: number;
  ImageTags?: Record<string, string>;
  ParentId?: string;
  UserData?: {
    IsFavorite?: boolean;
  };
};

type JellyfinItemsResponse = {
  Items: JellyfinItem[];
  TotalRecordCount: number;
};

type JellyfinAuthResult = {
  accessToken: string;
  userId: string;
  serverName: string;
};

// ── Helpers ───────────────────────────────────────────

async function apiFetch<T>(
  baseUrl: string,
  path: string,
  accessToken: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(path, baseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetchWithTimeout(url.toString(), {
    headers: { Authorization: buildAuthHeader(accessToken) },
  });

  if (!response.ok) {
    throw new Error(
      `Jellyfin API error: ${response.status} ${response.statusText} for ${path}`,
    );
  }

  return response.json() as Promise<T>;
}

// ── Authentication ────────────────────────────────────

const authenticate = async (
  baseUrl: string,
  username: string,
  password: string,
): Promise<JellyfinAuthResult> => {
  const url = new URL("/Users/AuthenticateByName", baseUrl);

  const response = await fetchWithTimeout(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(),
    },
    body: JSON.stringify({ Username: username, Pw: password }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid username or password");
    }
    throw new Error(`Authentication failed: ${response.status}`);
  }

  const data = await response.json() as {
    AccessToken: string;
    User: { Id: string };
    ServerId?: string;
  };

  return {
    accessToken: data.AccessToken,
    userId: data.User.Id,
    serverName: data.ServerId ?? "Jellyfin",
  };
};

// ── Library Fetching ──────────────────────────────────

const PAGE_SIZE = 500;

async function fetchAllItems(
  baseUrl: string,
  accessToken: string,
  userId: string,
  itemType: string,
): Promise<JellyfinItem[]> {
  const items: JellyfinItem[] = [];
  let startIndex = 0;

  const baseParams: Record<string, string> = {
    userId,
    includeItemTypes: itemType,
    recursive: "true",
    sortBy: "SortName",
    sortOrder: "Ascending",
    fields: "BasicSyncInfo,ParentId,UserData",
    enableImageTypes: "Primary",
    imageTypeLimit: "1",
    limit: String(PAGE_SIZE),
  };

  for (;;) {
    const data = await apiFetch<JellyfinItemsResponse>(
      baseUrl,
      "/Items",
      accessToken,
      { ...baseParams, startIndex: String(startIndex) },
    );

    items.push(...data.Items);

    if (items.length >= data.TotalRecordCount || data.Items.length < PAGE_SIZE) {
      break;
    }

    startIndex += PAGE_SIZE;
  }

  return items;
}

const fetchArtists = (baseUrl: string, accessToken: string, userId: string) =>
  fetchAllItems(baseUrl, accessToken, userId, "MusicArtist");

const fetchAlbums = (baseUrl: string, accessToken: string, userId: string) =>
  fetchAllItems(baseUrl, accessToken, userId, "MusicAlbum");

const fetchTracks = (baseUrl: string, accessToken: string, userId: string) =>
  fetchAllItems(baseUrl, accessToken, userId, "Audio");

// ── Stream & Artwork URLs ─────────────────────────────

const getStreamUrl = (baseUrl: string, itemId: string, accessToken: string): string => {
  // Use /stream?static=true to serve the raw file without transcoding.
  // The /universal endpoint does content negotiation that can return
  // video/mp2t (MPEG transport stream) which browsers can't play,
  // and adds unnecessary overhead on native where RNTP handles all
  // common formats (FLAC, MP3, AAC, OGG, etc.) natively.
  const url = new URL(`/Audio/${itemId}/stream`, baseUrl);
  url.searchParams.set("static", "true");
  url.searchParams.set("api_key", accessToken);
  return url.toString();
};

const getArtworkUrl = (
  baseUrl: string,
  itemId: string,
  size: 'small' | 'medium' | 'large' = 'medium',
): string => {
  const sizeMap = { small: 150, medium: 300, large: 600 };
  const url = new URL(`/Items/${itemId}/Images/Primary`, baseUrl);
  url.searchParams.set("maxWidth", String(sizeMap[size]));
  url.searchParams.set("maxHeight", String(sizeMap[size]));
  url.searchParams.set("quality", "90");
  return url.toString();
};

// ── Utility ───────────────────────────────────────────

const ticksToSeconds = (ticks?: number): number => {
  if (!ticks) return 0;
  return ticks / 10_000_000;
};

export type { JellyfinItem, JellyfinAuthResult };
export {
  authenticate,
  fetchArtists,
  fetchAlbums,
  fetchTracks,
  getStreamUrl,
  getArtworkUrl,
  ticksToSeconds,
};
