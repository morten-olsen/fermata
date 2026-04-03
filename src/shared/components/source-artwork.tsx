import { memo } from "react";

import { ArtworkService } from "@/src/services/artwork/artwork";
import { useService } from "@/src/hooks/service/service";

import { Artwork } from "./artwork";
import type { ArtworkAspect } from "./artwork";

type ArtworkSize = "sm" | "md" | "lg" | "xl";

const IMAGE_SIZE_MAP: Record<ArtworkSize, string> = {
  sm: "small",
  md: "medium",
  lg: "large",
  xl: "large",
};

interface SourceArtworkProps {
  sourceId: string;
  artworkSourceItemId: string | null | undefined;
  aspect?: ArtworkAspect;
  size?: ArtworkSize;
  width?: number;
  fill?: boolean;
  fallbackIcon?: string;
  heroTransition?: boolean;
  badge?: React.ReactNode;
}

export const SourceArtwork = memo(function SourceArtwork({
  sourceId,
  artworkSourceItemId,
  size = "md",
  ...rest
}: SourceArtworkProps) {
  const artworkService = useService(ArtworkService);
  const uri = artworkService.resolve(sourceId, artworkSourceItemId, IMAGE_SIZE_MAP[size]);

  return <Artwork uri={uri} size={size} {...rest} />;
});
