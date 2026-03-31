/** Storybook mock for @/src/features/artwork/artwork barrel */

export function resolveArtworkUrl(
  _sourceId: string,
  artworkSourceItemId: string | null,
  _size?: string,
): string | undefined {
  if (!artworkSourceItemId) return undefined;
  // Return a placeholder image based on the ID for visual variety
  const hash = artworkSourceItemId
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;
  // Use a data URI with an SVG gradient as placeholder artwork
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue},40%,25%)"/>
          <stop offset="100%" style="stop-color:hsl(${(hue + 60) % 360},50%,15%)"/>
        </linearGradient>
      </defs>
      <rect width="300" height="300" fill="url(#g)"/>
    </svg>`,
  )}`;
}

export function getCachedArtwork() {
  return undefined;
}
export function prefetchArtwork() {}
export function initArtworkCache() {}
export function cacheArtwork() {}
export function getCacheSize() {
  return 0;
}
export function useImageColors(_url?: string) {
  return { primary: "#1C1C1F", secondary: "#0A0A0B" };
}
