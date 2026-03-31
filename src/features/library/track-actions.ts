/** Data shape needed to show the track action sheet */
export interface TrackActionTarget {
  id: string;
  title: string;
  artistName: string;
  albumTitle: string;
  albumId?: string | null;
  sourceId: string;
  sourceItemId: string;
  isFavourite: boolean;
  artworkSourceItemId?: string | null;
}

/**
 * Build a TrackActionTarget from any object with track-like fields.
 * Works with DB rows, store types, and join results.
 */
export function toActionTarget(
  track: {
    id: string;
    title: string;
    artistName: string;
    albumTitle: string;
    albumId?: string | null;
    sourceId: string;
    sourceItemId: string;
    isFavourite?: number | boolean | null;
  },
  artworkSourceItemId?: string | null
): TrackActionTarget {
  return {
    id: track.id,
    title: track.title,
    artistName: track.artistName,
    albumTitle: track.albumTitle,
    albumId: track.albumId,
    sourceId: track.sourceId,
    sourceItemId: track.sourceItemId,
    isFavourite: !!track.isFavourite,
    artworkSourceItemId: artworkSourceItemId ?? null,
  };
}
