import { memo } from "react";
import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";

import { Artwork, type ArtworkAspect } from "@/src/shared/components/artwork";

interface DetailHeaderProps {
  artworkUri: string | null | undefined;
  /** @default "square" */
  artworkAspect?: ArtworkAspect;
  /** Fallback icon when no artwork. @default "disc" */
  fallbackIcon?: string;
  title: string;
  /** Subtitle text (e.g. artist name). */
  subtitle?: string;
  /** When provided, subtitle becomes tappable with accent color. */
  onSubtitlePress?: () => void;
  /** Metadata line below subtitle (e.g. "1997 · 12 tracks · Downloaded"). */
  meta?: string;
  /** Action buttons rendered below metadata (e.g. Play / Shuffle). */
  actions?: ReactNode;
  /** Whether to show the bottom divider. @default true */
  showDivider?: boolean;
}

export const DetailHeader = memo(function DetailHeader({
  artworkUri,
  artworkAspect = "square",
  fallbackIcon = "disc",
  title,
  subtitle,
  onSubtitlePress,
  meta,
  actions,
  showDivider = true,
}: DetailHeaderProps) {
  const artworkSize = artworkAspect === "portrait" ? 192 : 256;

  return (
    <View>
      <View className="items-center px-8 mb-6">
        <Artwork
          uri={artworkUri}
          aspect={artworkAspect}
          width={artworkSize}
          fallbackIcon={fallbackIcon}
          heroTransition
        />
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
