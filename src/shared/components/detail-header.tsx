import { memo } from "react";
import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";

import { Artwork, type ArtworkAspect } from "@/src/shared/components/artwork";
import { SourceArtwork } from "@/src/shared/components/source-artwork";

interface BaseDetailHeaderProps {
  /** @default "square" */
  artworkAspect?: ArtworkAspect;
  /** Fallback icon when no artwork. @default "disc" */
  fallbackIcon?: string;
  title: string;
  subtitle?: string;
  onSubtitlePress?: () => void;
  meta?: string;
  actions?: ReactNode;
  /** @default true */
  showDivider?: boolean;
}

interface UriArtworkProps extends BaseDetailHeaderProps {
  artworkUri: string | null | undefined;
  sourceId?: never;
  artworkSourceItemId?: never;
}

interface SourceArtworkProps extends BaseDetailHeaderProps {
  artworkUri?: never;
  sourceId: string;
  artworkSourceItemId: string | null | undefined;
}

type DetailHeaderProps = UriArtworkProps | SourceArtworkProps;

export const DetailHeader = memo(function DetailHeader({
  artworkAspect = "square",
  fallbackIcon = "disc",
  title,
  subtitle,
  onSubtitlePress,
  meta,
  actions,
  showDivider = true,
  ...artworkProps
}: DetailHeaderProps) {
  const artworkSize = artworkAspect === "portrait" ? 192 : 256;

  const artwork = 'sourceId' in artworkProps && artworkProps.sourceId
    ? (
      <SourceArtwork
        sourceId={artworkProps.sourceId}
        artworkSourceItemId={artworkProps.artworkSourceItemId}
        aspect={artworkAspect}
        width={artworkSize}
        fallbackIcon={fallbackIcon}
        heroTransition
      />
    )
    : (
      <Artwork
        uri={'artworkUri' in artworkProps ? artworkProps.artworkUri : undefined}
        aspect={artworkAspect}
        width={artworkSize}
        fallbackIcon={fallbackIcon}
        heroTransition
      />
    );

  return (
    <View>
      <View className="items-center px-8 mb-6">
        {artwork}
      </View>

      <View className="px-4 mb-2">
        <Text className="text-2xl font-bold text-fermata-text">{title}</Text>
        {subtitle && (
          onSubtitlePress ? (
            <Pressable onPress={onSubtitlePress}>
              <Text className="text-base text-fermata-accent mt-1">
                {subtitle}
              </Text>
            </Pressable>
          ) : (
            <Text className="text-base text-fermata-text-secondary mt-1">
              {subtitle}
            </Text>
          )
        )}
        {meta && (
          <Text className="text-sm text-fermata-muted mt-1">{meta}</Text>
        )}
      </View>

      {actions && (
        <View className="flex-row px-4 mt-4 mb-4 gap-3">{actions}</View>
      )}

      {showDivider && <View className="h-px bg-fermata-border mx-4 mb-2" />}
    </View>
  );
});
