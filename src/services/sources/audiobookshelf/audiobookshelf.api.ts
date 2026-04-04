import { log } from "@/src/shared/lib/log";
import { fetchWithTimeout } from "@/src/shared/lib/fetch";

import type {
  AbsLoginResponse,
  AbsLibrariesResponse,
  AbsLibrary,
  AbsLibraryItem,
  AbsLibraryItemsResponse,
} from "./audiobookshelf.types";

const PAGE_LIMIT = 100;
const FETCH_CONCURRENCY = 10;

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function apiFetch<T>(
  baseUrl: string,
  path: string,
  token: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(path, baseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetchWithTimeout(url.toString(), {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(
      `Audiobookshelf API error: ${response.status} ${response.statusText} for ${path}`,
    );
  }

  return response.json() as Promise<T>;
}

// ── Authentication ────────────────────────────────────

type AbsAuthResult = {
  token: string;
  userId: string;
};

const authenticate = async (
  baseUrl: string,
  username: string,
  password: string,
): Promise<AbsAuthResult> => {
  const url = new URL("/login", baseUrl);

  const response = await fetchWithTimeout(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid username or password");
    }
    throw new Error(`Authentication failed: ${response.status}`);
  }

  const data = (await response.json()) as AbsLoginResponse;
  return { token: data.user.token, userId: data.user.id };
};

// ── Libraries ─────────────────────────────────────────

const fetchLibraries = async (
  baseUrl: string,
  token: string,
): Promise<AbsLibrary[]> => {
  const data = await apiFetch<AbsLibrariesResponse>(baseUrl, "/api/libraries", token);
  log("ABS fetchLibraries:", data.libraries.length, "libraries");
  return data.libraries;
};

// ── Library Items ─────────────────────────────────────

const fetchLibraryItem = (
  baseUrl: string,
  token: string,
  itemId: string,
): Promise<AbsLibraryItem> =>
  apiFetch<AbsLibraryItem>(baseUrl, `/api/items/${itemId}`, token, { expanded: "1" });

const fetchAllLibraryItems = async (
  baseUrl: string,
  token: string,
  libraryId: string,
): Promise<AbsLibraryItem[]> => {
  const itemIds: string[] = [];
  let page = 0;

  for (;;) {
    const data = await apiFetch<AbsLibraryItemsResponse>(
      baseUrl,
      `/api/libraries/${libraryId}/items`,
      token,
      { limit: String(PAGE_LIMIT), page: String(page) },
    );

    for (const item of data.results) {
      itemIds.push(item.id);
    }

    if (itemIds.length >= data.total || data.results.length < PAGE_LIMIT) {
      break;
    }
    page++;
  }

  const items: AbsLibraryItem[] = [];
  for (let i = 0; i < itemIds.length; i += FETCH_CONCURRENCY) {
    const batch = itemIds.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(
      batch.map((id) => fetchLibraryItem(baseUrl, token, id)),
    );
    items.push(...results);
  }

  return items;
};

// ── Stream & Artwork URLs ─────────────────────────────

const startPlaySession = async (
  baseUrl: string,
  token: string,
  itemId: string,
  episodeId?: string,
): Promise<string> => {
  const path = episodeId
    ? `/api/items/${itemId}/play/${episodeId}`
    : `/api/items/${itemId}/play`;
  const url = new URL(path, baseUrl);

  const response = await fetchWithTimeout(url.toString(), {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceInfo: { clientName: "Fermata" },
      forceDirectPlay: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`ABS play session failed: ${response.status} ${response.statusText}`);
  }

  const session = await response.json() as {
    id: string;
    playMethod: number;
    audioTracks: { contentUrl: string; mimeType: string }[];
  };

  if (session.playMethod === 2) {
    const hlsUrl = new URL(`/hls/${session.id}/output.m3u8`, baseUrl);
    hlsUrl.searchParams.set("token", token);
    return hlsUrl.toString();
  }

  if (session.audioTracks.length) {
    const trackUrl = new URL(session.audioTracks[0].contentUrl, baseUrl);
    trackUrl.searchParams.set("token", token);
    return trackUrl.toString();
  }

  throw new Error("ABS play session returned no usable stream");
};

const getArtworkUrl = (
  baseUrl: string,
  itemId: string,
  size: 'small' | 'medium' | 'large' = 'medium',
): string => {
  const sizeMap = { small: 150, medium: 300, large: 600 };
  const url = new URL(`/api/items/${itemId}/cover`, baseUrl);
  url.searchParams.set("width", String(sizeMap[size]));
  return url.toString();
};

export type { AbsAuthResult };
export {
  authenticate,
  fetchLibraries,
  fetchAllLibraryItems,
  startPlaySession,
  getArtworkUrl,
};
