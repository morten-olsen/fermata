import { memo } from "react";

import { Artwork } from "./artwork";
import type { ArtworkAspect } from "./artwork";

type ArtworkSize = "sm" | "md" | "lg" | "xl";

interface SourceArtworkProps {
  /** Preferred: local artwork URI from the entity row */
  artworkUri?: string | null;
  /** @deprecated Use artworkUri instead — these are ignored if artworkUri is set */
  sourceId?: string;
  /** @deprecated Use artworkUri instead */
  artworkSourceItemId?: string | null;
  aspect?: ArtworkAspect;
  size?: ArtworkSize;
  width?: number;
  fill?: boolean;
  fallbackIcon?: string;
  heroTransition?: boolean;
  badge?: React.ReactNode;
}

export const SourceArtwork = memo(function SourceArtwork({
  artworkUri,
  ...rest
}: SourceArtworkProps) {
  return <Artwork uri={artworkUri ?? undefined} {...rest} />;
});
