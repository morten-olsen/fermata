import { log } from "@/src/shared/lib/log";
import { fetchWithTimeout } from "@/src/shared/lib/fetch";

import type {
  AbsLoginResponse,
  AbsLibrariesResponse,
  AbsLibrary,
  AbsLibraryItem,
  AbsLibraryItemsResponse,
  AbsMediaProgress,
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

// ── Authentication ─────────────────────────────────────

export interface AbsAuthResult {
  token: string;
  userId: string;
}

export async function authenticate(
  baseUrl: string,
  username: string,
  password: string,
): Promise<AbsAuthResult> {
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

  return {
    token: data.user.token,
    userId: data.user.id,
  };
}

export async function testConnection(
  baseUrl: string,
): Promise<boolean> {
  try {
    // /ping requires no auth and returns { success: true }
    const url = new URL("/ping", baseUrl);
    const response = await fetchWithTimeout(
      url.toString(),
      {},
      5_000,
    );
    return response.ok;
  } catch {
    return false;
  }
}

// ── Libraries ──────────────────────────────────────────

export async function fetchLibraries(
  baseUrl: string,
  token: string,
): Promise<AbsLibrary[]> {
  const data = await apiFetch<AbsLibrariesResponse>(
    baseUrl,
    "/api/libraries",
    token,
  );
  log("ABS fetchLibraries:", data.libraries.length, "libraries —", data.libraries.map((l) => `${l.name} (${l.mediaType})`).join(", "));
  return data.libraries;
}

// ── Library Items ──────────────────────────────────────

/**
 * Fetch all library items with full media data (episodes, chapters, audioFiles).
 *
 * The listing endpoint doesn't return expanded media, so we first get the list
 * of IDs, then fetch each item individually with `expanded=1`.
 */
export async function fetchAllLibraryItems(
  baseUrl: string,
  token: string,
  libraryId: string,
): Promise<AbsLibraryItem[]> {
  // Step 1: Get item IDs from the listing endpoint
  const itemIds: string[] = [];
  let page = 0;

  while (true) {
    const data = await apiFetch<AbsLibraryItemsResponse>(
      baseUrl,
      `/api/libraries/${libraryId}/items`,
      token,
      {
        limit: String(PAGE_LIMIT),
        page: String(page),
      },
    );

    log("ABS fetchAllLibraryItems: page", page, "total:", data.total, "results:", data.results.length);

    for (const item of data.results) {
      itemIds.push(item.id);
    }

    if (itemIds.length >= data.total || data.results.length < PAGE_LIMIT) {
      break;
    }

    page++;
  }

  log("ABS fetchAllLibraryItems: found", itemIds.length, "items to expand");

  // Step 2: Fetch each item with expanded data, batched for concurrency
  const items: AbsLibraryItem[] = [];
  for (let i = 0; i < itemIds.length; i += FETCH_CONCURRENCY) {
    const batch = itemIds.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(
      batch.map((id) => fetchLibraryItem(baseUrl, token, id)),
    );
    items.push(...results);
  }

  return items;
}

export async function fetchLibraryItem(
  baseUrl: string,
  token: string,
  itemId: string,
): Promise<AbsLibraryItem> {
  return apiFetch<AbsLibraryItem>(
    baseUrl,
    `/api/items/${itemId}`,
    token,
    { expanded: "1" },
  );
}

// ── Stream & Artwork URLs ──────────────────────────────

/**
 * Get a direct stream URL for an audio file.
 * For podcasts: streams the episode's audio file.
 * For audiobooks: streams a specific audio file by index.
 */
export function getStreamUrl(
  baseUrl: string,
  itemId: string,
  token: string,
  episodeId?: string,
): string {
  const path = episodeId
    ? `/api/items/${itemId}/play/${episodeId}`
    : `/api/items/${itemId}/play`;
  const url = new URL(path, baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export function getArtworkUrl(
  baseUrl: string,
  itemId: string,
  size: "small" | "medium" | "large" = "medium",
): string {
  const sizeMap = { small: 150, medium: 300, large: 600 };
  const maxWidth = sizeMap[size];

  const url = new URL(`/api/items/${itemId}/cover`, baseUrl);
  url.searchParams.set("width", String(maxWidth));
  return url.toString();
}

// ── Playback Progress ──────────────────────────────────

export async function reportProgress(
  baseUrl: string,
  token: string,
  libraryItemId: string,
  currentTime: number,
  duration: number,
  isFinished: boolean,
  episodeId?: string,
): Promise<void> {
  const path = episodeId
    ? `/api/me/progress/${libraryItemId}/${episodeId}`
    : `/api/me/progress/${libraryItemId}`;

  const url = new URL(path, baseUrl);

  const progress = duration > 0 ? currentTime / duration : 0;

  const response = await fetchWithTimeout(url.toString(), {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      duration,
      currentTime,
      progress,
      isFinished,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Audiobookshelf progress report failed: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Fetch all media progress entries for the current user via /api/me.
 */
export async function fetchUserProgress(
  baseUrl: string,
  token: string,
): Promise<AbsMediaProgress[]> {
  const data = await apiFetch<{ mediaProgress: AbsMediaProgress[] }>(
    baseUrl,
    "/api/me",
    token,
  );
  return data.mediaProgress;
}
