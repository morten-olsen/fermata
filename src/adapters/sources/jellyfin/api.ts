const CLIENT_NAME = "Fermata";
const CLIENT_VERSION = "0.1.0";
const DEVICE_NAME = "Fermata Mobile";

function getDeviceId(): string {
  // In production, persist this per-device. For now, use a stable value.
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

export interface JellyfinAuthResult {
  accessToken: string;
  userId: string;
  serverName: string;
}

export interface JellyfinItem {
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
  IndexNumber?: number; // track number
  ParentIndexNumber?: number; // disc number
  RunTimeTicks?: number;
  ChildCount?: number;
  ImageTags?: Record<string, string>;
  ParentId?: string;
  UserData?: {
    IsFavorite?: boolean;
  };
}

interface JellyfinItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
}

interface JellyfinView {
  Id: string;
  Name: string;
  CollectionType?: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

async function apiFetch<T>(
  baseUrl: string,
  path: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(path, baseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      Authorization: buildAuthHeader(accessToken),
    },
  });

  if (!response.ok) {
    throw new Error(
      `Jellyfin API error: ${response.status} ${response.statusText} for ${path}`
    );
  }

  return response.json() as Promise<T>;
}

// ── Authentication ─────────────────────────────────────

export async function authenticate(
  baseUrl: string,
  username: string,
  password: string
): Promise<JellyfinAuthResult> {
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

  const data = await response.json();

  return {
    accessToken: data.AccessToken,
    userId: data.User.Id,
    serverName: data.ServerId ?? data.User.ServerId ?? "Jellyfin",
  };
}

export async function testConnection(
  baseUrl: string,
  accessToken: string
): Promise<boolean> {
  try {
    const url = new URL("/System/Info/Public", baseUrl);
    const response = await fetchWithTimeout(
      url.toString(),
      { headers: { Authorization: buildAuthHeader(accessToken) } },
      5_000
    );
    return response.ok;
  } catch {
    return false;
  }
}

// ── Library Fetching ───────────────────────────────────

async function getMusicLibraryId(
  baseUrl: string,
  accessToken: string,
  userId: string
): Promise<string | null> {
  const data = await apiFetch<{ Items: JellyfinView[] }>(
    baseUrl,
    `/Users/${userId}/Views`,
    accessToken
  );

  const musicView = data.Items.find(
    (item) => item.CollectionType === "music"
  );

  return musicView?.Id ?? null;
}

const PAGE_SIZE = 500;

async function fetchAllItems(
  baseUrl: string,
  accessToken: string,
  userId: string,
  itemType: string,
  since?: Date
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

  if (since) {
    baseParams.minDateLastSaved = since.toISOString();
  }

  while (true) {
    const data = await apiFetch<JellyfinItemsResponse>(
      baseUrl,
      "/Items",
      accessToken,
      { ...baseParams, startIndex: String(startIndex) }
    );

    items.push(...data.Items);

    if (items.length >= data.TotalRecordCount || data.Items.length < PAGE_SIZE) {
      break;
    }

    startIndex += PAGE_SIZE;
  }

  return items;
}

export async function fetchArtists(
  baseUrl: string,
  accessToken: string,
  userId: string,
  since?: Date
): Promise<JellyfinItem[]> {
  return fetchAllItems(baseUrl, accessToken, userId, "MusicArtist", since);
}

export async function fetchAlbums(
  baseUrl: string,
  accessToken: string,
  userId: string,
  since?: Date
): Promise<JellyfinItem[]> {
  return fetchAllItems(baseUrl, accessToken, userId, "MusicAlbum", since);
}

export async function fetchTracks(
  baseUrl: string,
  accessToken: string,
  userId: string,
  since?: Date
): Promise<JellyfinItem[]> {
  return fetchAllItems(baseUrl, accessToken, userId, "Audio", since);
}

// ── Stream & Artwork URLs ──────────────────────────────

export function getStreamUrl(
  baseUrl: string,
  itemId: string,
  accessToken: string
): string {
  const url = new URL(`/Audio/${itemId}/universal`, baseUrl);
  url.searchParams.set("container", "opus,mp3,aac,flac,wav,ogg");
  url.searchParams.set("maxStreamingBitrate", "999999999");
  url.searchParams.set("api_key", accessToken);
  return url.toString();
}

export function getArtworkUrl(
  baseUrl: string,
  itemId: string,
  size: "small" | "medium" | "large" = "medium"
): string {
  const sizeMap = { small: 150, medium: 300, large: 600 };
  const maxWidth = sizeMap[size];

  const url = new URL(`/Items/${itemId}/Images/Primary`, baseUrl);
  url.searchParams.set("maxWidth", String(maxWidth));
  url.searchParams.set("maxHeight", String(maxWidth));
  url.searchParams.set("quality", "90");
  return url.toString();
}

// ── Playlists ─────────────────────────────────────────

export async function fetchPlaylists(
  baseUrl: string,
  accessToken: string,
  userId: string
): Promise<JellyfinItem[]> {
  return fetchAllItems(baseUrl, accessToken, userId, "Playlist");
}

export async function fetchPlaylistItems(
  baseUrl: string,
  accessToken: string,
  playlistId: string,
  userId: string
): Promise<JellyfinItem[]> {
  const data = await apiFetch<JellyfinItemsResponse>(
    baseUrl,
    `/Playlists/${playlistId}/Items`,
    accessToken,
    { userId, fields: "BasicSyncInfo" }
  );
  return data.Items;
}

export async function apiCreatePlaylist(
  baseUrl: string,
  accessToken: string,
  userId: string,
  name: string,
  trackIds?: string[]
): Promise<string> {
  const url = new URL("/Playlists", baseUrl);
  const response = await fetchWithTimeout(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildAuthHeader(accessToken),
    },
    body: JSON.stringify({
      Name: name,
      Ids: trackIds ?? [],
      UserId: userId,
      MediaType: "Audio",
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create playlist: ${response.status}`);
  }
  const data = await response.json();
  return data.Id;
}

export async function apiDeletePlaylist(
  baseUrl: string,
  accessToken: string,
  itemId: string
): Promise<void> {
  const url = new URL(`/Items/${itemId}`, baseUrl);
  await fetchWithTimeout(url.toString(), {
    method: "DELETE",
    headers: { Authorization: buildAuthHeader(accessToken) },
  });
}

export async function apiAddToPlaylist(
  baseUrl: string,
  accessToken: string,
  playlistId: string,
  trackIds: string[]
): Promise<void> {
  const url = new URL(`/Playlists/${playlistId}/Items`, baseUrl);
  url.searchParams.set("ids", trackIds.join(","));
  await fetchWithTimeout(url.toString(), {
    method: "POST",
    headers: { Authorization: buildAuthHeader(accessToken) },
  });
}

export async function apiRemoveFromPlaylist(
  baseUrl: string,
  accessToken: string,
  playlistId: string,
  entryIds: string[]
): Promise<void> {
  const url = new URL(`/Playlists/${playlistId}/Items`, baseUrl);
  url.searchParams.set("entryIds", entryIds.join(","));
  await fetchWithTimeout(url.toString(), {
    method: "DELETE",
    headers: { Authorization: buildAuthHeader(accessToken) },
  });
}

// ── Favourites ────────────────────────────────────────

export async function setFavourite(
  baseUrl: string,
  accessToken: string,
  userId: string,
  itemId: string,
  isFavourite: boolean
): Promise<void> {
  const url = new URL(`/Users/${userId}/FavoriteItems/${itemId}`, baseUrl);
  await fetchWithTimeout(url.toString(), {
    method: isFavourite ? "POST" : "DELETE",
    headers: { Authorization: buildAuthHeader(accessToken) },
  });
}

// ── Ticks to seconds ───────────────────────────────────

export function ticksToSeconds(ticks?: number): number {
  if (!ticks) return 0;
  return ticks / 10_000_000;
}

export { getMusicLibraryId };
