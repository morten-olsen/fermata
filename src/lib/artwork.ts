import { useSourcesStore } from "../stores/sources";
import { getCachedArtwork } from "../services/artwork-cache";
import type { ImageSize } from "../adapters/sources/types";

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
