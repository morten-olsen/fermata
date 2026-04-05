import { memo } from "react";
import type { ReactNode } from "react";
import { View, Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { SourceArtwork, PressableScale } from "@/src/components/primitives/primitives";
import type { ArtworkAspect } from "@/src/components/primitives/primitives";

import { colors } from "@/src/shared/theme/theme";

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

interface MediaCardRootProps {
  children: ReactNode;
  onPress: () => void;
}

const MediaCardRoot = memo(function MediaCardRoot({ children, onPress }: MediaCardRootProps) {
  return (
    <PressableScale onPress={onPress} className="mb-4">
      {children}
    </PressableScale>
  );
});

// ---------------------------------------------------------------------------
// Artwork
// ---------------------------------------------------------------------------

interface MediaCardArtworkProps {
  uri?: string | null;
  /** @default "square" */
  aspect?: ArtworkAspect;
  /** @default "disc" */
  fallbackIcon?: string;
  /** Badge overlay (bottom-right). */
  badge?: ReactNode;
  children?: ReactNode;
}

const MediaCardArtwork = memo(function MediaCardArtwork({
  uri,
  aspect = "square",
  fallbackIcon = "disc",
  badge,
  children,
}: MediaCardArtworkProps) {
  return (
    <View style={{ position: "relative" }}>
      <SourceArtwork artworkUri={uri} aspect={aspect} fill fallbackIcon={fallbackIcon} badge={badge} />
      {children}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const MediaCardDownloadBadge = memo(function MediaCardDownloadBadge() {
  return (
    <View style={{ backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, padding: 3 }}>
      <Ionicons name="cloud-done" size={12} color={colors.accent} />
    </View>
  );
});

interface MediaCardProgressBadgeProps {
  progress: number;
}

const MediaCardProgressBadge = memo(function MediaCardProgressBadge({ progress }: MediaCardProgressBadgeProps) {
  const pct = Math.round(Math.min(progress, 1) * 100);

  return (
    <View style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ color: colors.accent, fontSize: 10, fontWeight: "700" }}>{pct}%</Text>
    </View>
  );
});

interface MediaCardCountBadgeProps {
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
}

const MediaCardCountBadge = memo(function MediaCardCountBadge({ icon, count }: MediaCardCountBadgeProps) {
  return (
    <View
      style={{
        backgroundColor: "rgba(0,0,0,0.7)",
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
      }}
    >
      <Ionicons name={icon} size={10} color={colors.textSecondary} />
      <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: "600" }}>{count}</Text>
    </View>
  );
});

const MediaCardNewIndicator = memo(function MediaCardNewIndicator() {
  return (
    <View
      style={{
        position: "absolute",
        top: 6,
        right: 6,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.accent,
      }}
    />
  );
});

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

interface MediaCardTitleProps {
  children: string;
}

const MediaCardTitle = memo(function MediaCardTitle({ children }: MediaCardTitleProps) {
  return (
    <Text className="text-fermata-text text-sm font-medium mt-2" numberOfLines={1}>
      {children}
    </Text>
  );
});

interface MediaCardSubtitleProps {
  children: string;
}

const MediaCardSubtitle = memo(function MediaCardSubtitle({ children }: MediaCardSubtitleProps) {
  return (
    <Text className="text-fermata-text-secondary text-xs" numberOfLines={1}>
      {children}
    </Text>
  );
});

// ---------------------------------------------------------------------------
// Preset: Album
// ---------------------------------------------------------------------------

interface AlbumPresetProps {
  title: string;
  artistName: string;
  year?: number | null;
  artworkUri?: string | null;
  isDownloaded?: boolean;
  onPress: () => void;
}

const MediaCardAlbum = memo(function MediaCardAlbum(props: AlbumPresetProps) {
  const badge = props.isDownloaded ? <MediaCardDownloadBadge /> : undefined;

  return (
    <MediaCardRoot onPress={props.onPress}>
      <MediaCardArtwork uri={props.artworkUri} fallbackIcon="disc" badge={badge} />
      <MediaCardTitle>{props.title}</MediaCardTitle>
      <MediaCardSubtitle>
        {props.artistName}{props.year ? ` · ${props.year}` : ""}
      </MediaCardSubtitle>
    </MediaCardRoot>
  );
});

// ---------------------------------------------------------------------------
// Preset: Show (podcast)
// ---------------------------------------------------------------------------

interface ShowPresetProps {
  title: string;
  artistName: string;
  episodeCount?: number;
  artworkUri?: string | null;
  hasNew?: boolean;
  onPress: () => void;
}

const MediaCardShow = memo(function MediaCardShow(props: ShowPresetProps) {
  const badge = props.episodeCount != null
    ? <MediaCardCountBadge icon="mic" count={props.episodeCount} />
    : undefined;

  return (
    <MediaCardRoot onPress={props.onPress}>
      <MediaCardArtwork uri={props.artworkUri} fallbackIcon="mic" badge={badge}>
        {props.hasNew ? <MediaCardNewIndicator /> : null}
      </MediaCardArtwork>
      <MediaCardTitle>{props.title}</MediaCardTitle>
      <MediaCardSubtitle>{props.artistName}</MediaCardSubtitle>
    </MediaCardRoot>
  );
});

// ---------------------------------------------------------------------------
// Preset: Book (audiobook)
// ---------------------------------------------------------------------------

interface BookPresetProps {
  title: string;
  artistName: string;
  artworkUri?: string | null;
  progress?: number;
  isDownloaded?: boolean;
  onPress: () => void;
}

const MediaCardBook = memo(function MediaCardBook(props: BookPresetProps) {
  const badge =
    props.progress != null && props.progress > 0
      ? <MediaCardProgressBadge progress={props.progress} />
      : props.isDownloaded
        ? <MediaCardDownloadBadge />
        : undefined;

  return (
    <MediaCardRoot onPress={props.onPress}>
      <MediaCardArtwork uri={props.artworkUri} aspect="portrait" fallbackIcon="book" badge={badge} />
      <MediaCardTitle>{props.title}</MediaCardTitle>
      <MediaCardSubtitle>{props.artistName}</MediaCardSubtitle>
    </MediaCardRoot>
  );
});

// ---------------------------------------------------------------------------
// Compound export
// ---------------------------------------------------------------------------

export const MediaCard = Object.assign(MediaCardRoot, {
  Artwork: MediaCardArtwork,
  Title: MediaCardTitle,
  Subtitle: MediaCardSubtitle,
  DownloadBadge: MediaCardDownloadBadge,
  ProgressBadge: MediaCardProgressBadge,
  CountBadge: MediaCardCountBadge,
  NewIndicator: MediaCardNewIndicator,
  Album: MediaCardAlbum,
  Show: MediaCardShow,
  Book: MediaCardBook,
});
