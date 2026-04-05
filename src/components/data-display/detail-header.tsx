import { memo } from "react";
import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";

import { Artwork } from "@/src/components/primitives/primitives";
import type { ArtworkAspect } from "@/src/components/primitives/primitives";

// ---------------------------------------------------------------------------
// Flat props API (preserved for backwards compatibility)
// ---------------------------------------------------------------------------

interface DetailHeaderFlatProps {
  /** @default "square" */
  artworkAspect?: ArtworkAspect;
  /** Fallback icon when no artwork. @default "disc" */
  fallbackIcon?: string;
  artworkUri?: string | null;
  title: string;
  subtitle?: string;
  onSubtitlePress?: () => void;
  meta?: string;
  actions?: ReactNode;
  /** @default true */
  showDivider?: boolean;
}

const DetailHeaderFlat = memo(function DetailHeaderFlat({
  artworkAspect = "square",
  fallbackIcon = "disc",
  artworkUri,
  title,
  subtitle,
  onSubtitlePress,
  meta,
  actions,
  showDivider = true,
}: DetailHeaderFlatProps) {
  const artworkSize = artworkAspect === "portrait" ? 192 : 256;

  return (
    <View>
      <View className="items-center px-8 mb-6">
        <Artwork
          uri={artworkUri ?? undefined}
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

// ---------------------------------------------------------------------------
// Compound sub-components
// ---------------------------------------------------------------------------

interface DetailHeaderRootProps {
  children: ReactNode;
  /** @default true */
  showDivider?: boolean;
}

const DetailHeaderRoot = memo(function DetailHeaderRoot({
  children,
  showDivider = true,
}: DetailHeaderRootProps) {
  return (
    <View>
      {children}
      {showDivider && <View className="h-px bg-fermata-border mx-4 mb-2" />}
    </View>
  );
});

interface DetailHeaderArtworkProps {
  uri?: string | null;
  /** @default "square" */
  aspect?: ArtworkAspect;
  /** @default "disc" */
  fallbackIcon?: string;
}

const DetailHeaderArtwork = memo(function DetailHeaderArtwork({
  uri,
  aspect = "square",
  fallbackIcon = "disc",
}: DetailHeaderArtworkProps) {
  const size = aspect === "portrait" ? 192 : 256;

  return (
    <View className="items-center px-8 mb-6">
      <Artwork
        uri={uri ?? undefined}
        aspect={aspect}
        width={size}
        fallbackIcon={fallbackIcon}
        heroTransition
      />
    </View>
  );
});

interface DetailHeaderTitleProps {
  children: string;
}

const DetailHeaderTitle = memo(function DetailHeaderTitle({ children }: DetailHeaderTitleProps) {
  return (
    <View className="px-4">
      <Text className="text-2xl font-bold text-fermata-text">{children}</Text>
    </View>
  );
});

interface DetailHeaderSubtitleProps {
  children: string;
  onPress?: () => void;
}

const DetailHeaderSubtitle = memo(function DetailHeaderSubtitle({
  children,
  onPress,
}: DetailHeaderSubtitleProps) {
  if (onPress) {
    return (
      <View className="px-4">
        <Pressable onPress={onPress}>
          <Text className="text-base text-fermata-accent mt-1">{children}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="px-4">
      <Text className="text-base text-fermata-text-secondary mt-1">{children}</Text>
    </View>
  );
});

interface DetailHeaderMetaProps {
  children: string;
}

const DetailHeaderMeta = memo(function DetailHeaderMeta({ children }: DetailHeaderMetaProps) {
  return (
    <View className="px-4">
      <Text className="text-sm text-fermata-muted mt-1">{children}</Text>
    </View>
  );
});

interface DetailHeaderActionsProps {
  children: ReactNode;
}

const DetailHeaderActions = memo(function DetailHeaderActions({ children }: DetailHeaderActionsProps) {
  return (
    <View className="flex-row px-4 mt-4 mb-4 gap-3">{children}</View>
  );
});

// ---------------------------------------------------------------------------
// Compound export — flat API is the default, compound via sub-components
// ---------------------------------------------------------------------------

export const DetailHeader = Object.assign(DetailHeaderFlat, {
  Root: DetailHeaderRoot,
  Artwork: DetailHeaderArtwork,
  Title: DetailHeaderTitle,
  Subtitle: DetailHeaderSubtitle,
  Meta: DetailHeaderMeta,
  Actions: DetailHeaderActions,
});
