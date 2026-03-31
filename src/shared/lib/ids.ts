/** Deterministic ID for synced entities — stable across re-syncs */
export function stableId(sourceId: string, sourceItemId: string): string {
  let hash = 0;
  const input = `${sourceId}:${sourceItemId}`;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `${sourceId.slice(0, 8)}-${(hash >>> 0).toString(36)}`;
}

/** Random ID for local-only entities (playlists, etc.) */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
