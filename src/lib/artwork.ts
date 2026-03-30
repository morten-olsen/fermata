import { useSourcesStore } from "../stores/sources";
import type { ImageSize } from "../adapters/sources/types";

/**
 * Resolve an artwork source item ID to a full URL via the adapter.
 * Returns undefined if the source is not connected or the item has no artwork.
 */
export function resolveArtworkUrl(
  sourceId: string,
  artworkSourceItemId: string | null,
  size: ImageSize = "medium"
): string | undefined {
  if (!artworkSourceItemId) return undefined;
  const adapter = useSourcesStore.getState().getAdapter(sourceId);
  if (!adapter) return undefined;
  return adapter.getArtworkUrl(artworkSourceItemId, size);
}
