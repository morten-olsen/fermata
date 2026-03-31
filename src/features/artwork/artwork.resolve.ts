import { useSourcesStore } from "@/src/features/sources/sources";
import type { ImageSize } from "@/src/features/sources/sources";

import { getCachedArtwork } from "./artwork.cache";

/**
 * Resolve an artwork source item ID to a displayable URI.
 * Prefers locally cached file, falls back to remote URL via the adapter.
 */
export function resolveArtworkUrl(
  sourceId: string,
  artworkSourceItemId: string | null,
  size: ImageSize = "medium"
): string | undefined {
  if (!artworkSourceItemId) return undefined;

  // Check local cache first (instant, works offline)
  const cached = getCachedArtwork(sourceId, artworkSourceItemId, size);
  if (cached) return cached;

  // Fall back to remote URL
  const adapter = useSourcesStore.getState().getAdapter(sourceId);
  if (!adapter) return undefined;
  return adapter.getArtworkUrl(artworkSourceItemId, size);
}
