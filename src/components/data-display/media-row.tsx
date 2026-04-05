import { createContext, memo, useContext } from "react";
import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { EqualizerBars } from "@/src/components/playback/equalizer-bars";
import { ProgressBar } from "@/src/components/feedback/feedback";

import { colors } from "@/src/shared/theme/theme";
import { formatDuration, formatRemainingDuration } from "@/src/shared/lib/format";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface MediaRowContextValue {
  isPlaying?: boolean;
  isCompleted?: boolean;
}

const MediaRowContext = createContext<MediaRowContextValue>({});

function useMediaRow() {
  return useContext(MediaRowContext);
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

interface MediaRowRootProps {
  children: ReactNode;
  onPress: () => void;
  isPlaying?: boolean;
  isCompleted?: boolean;
}

const MediaRowRoot = memo(function MediaRowRoot({
  children,
  onPress,
  isPlaying,
  isCompleted,
}: MediaRowRootProps) {
  return (
    <MediaRowContext.Provider value={{ isPlaying, isCompleted }}>
      <Pressable onPress={onPress} className="flex-row items-center py-3 px-1">
        {children}
      </Pressable>
    </MediaRowContext.Provider>
  );
});

// ---------------------------------------------------------------------------
// Leading
// ---------------------------------------------------------------------------

interface MediaRowLeadingProps {
  children: ReactNode;
}

const MediaRowLeading = memo(function MediaRowLeading({ children }: MediaRowLeadingProps) {
  return <View className="w-8 items-center">{children}</View>;
});

// ---------------------------------------------------------------------------
// Leading presets
// ---------------------------------------------------------------------------

interface TrackNumberProps {
  value: number;
}

const MediaRowTrackNumber = memo(function MediaRowTrackNumber({ value }: TrackNumberProps) {
  return <Text className="text-fermata-muted text-sm">{value}</Text>;
});

interface PlayingIndicatorProps {
  size?: number;
  color?: string;
}

const MediaRowPlayingIndicator = memo(function MediaRowPlayingIndicator({
  size = 16,
  color = colors.accent,
}: PlayingIndicatorProps) {
  return <EqualizerBars size={size} color={color} />;
});

const MediaRowCompletedIcon = memo(function MediaRowCompletedIcon() {
  return <Ionicons name="checkmark-circle" size={18} color={colors.muted} />;
});

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

interface MediaRowContentProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

const MediaRowContent = memo(function MediaRowContent({
  title,
  subtitle,
  children,
}: MediaRowContentProps) {
  const { isPlaying, isCompleted } = useMediaRow();

  return (
    <View className="flex-1 ml-2">
      <Text
        className={`text-base font-medium ${
          isPlaying
            ? "text-fermata-accent"
            : isCompleted
              ? "text-fermata-muted"
              : "text-fermata-text"
        }`}
        numberOfLines={1}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-fermata-text-secondary text-xs" numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

interface MediaRowProgressProps {
  value: number;
}

const MediaRowProgress = memo(function MediaRowProgress({ value }: MediaRowProgressProps) {
  const { isCompleted } = useMediaRow();
  if (value <= 0 || isCompleted) return null;

  return (
    <View className="mt-1">
      <ProgressBar value={value} />
    </View>
  );
});

// ---------------------------------------------------------------------------
// Trailing
// ---------------------------------------------------------------------------

interface MediaRowTrailingProps {
  children: ReactNode;
}

const MediaRowTrailing = memo(function MediaRowTrailing({ children }: MediaRowTrailingProps) {
  return <View className="flex-row items-center">{children}</View>;
});

// ---------------------------------------------------------------------------
// Trailing presets
// ---------------------------------------------------------------------------

const MediaRowDownloadBadge = memo(function MediaRowDownloadBadge() {
  return (
    <Ionicons name="cloud-done" size={12} color={colors.muted} style={{ marginLeft: 4 }} />
  );
});

interface MediaRowQueuedBadgeProps {
  /** Uses a lighter icon. */
  queued?: boolean;
}

const MediaRowQueuedBadge = memo(function MediaRowQueuedBadge({ queued }: MediaRowQueuedBadgeProps) {
  if (!queued) return null;
  return (
    <Ionicons name="cloud-download-outline" size={12} color={colors.border} style={{ marginLeft: 4 }} />
  );
});

interface MediaRowDurationProps {
  seconds: number;
  /** Use remaining duration (subtracts progress). */
  remaining?: boolean;
  progress?: number;
  isCompleted?: boolean;
}

const MediaRowDuration = memo(function MediaRowDuration({
  seconds,
  remaining,
  progress,
  isCompleted,
}: MediaRowDurationProps) {
  const text = remaining
    ? formatRemainingDuration(seconds, progress, isCompleted)
    : formatDuration(seconds);

  return <Text className="text-fermata-muted text-sm ml-1">{text}</Text>;
});

interface MediaRowMoreButtonProps {
  onPress: () => void;
  /** @default "ellipsis-horizontal" */
  icon?: keyof typeof Ionicons.glyphMap;
}

const MediaRowMoreButton = memo(function MediaRowMoreButton({
  onPress,
  icon = "ellipsis-horizontal",
}: MediaRowMoreButtonProps) {
  return (
    <Pressable onPress={onPress} hitSlop={8} className="p-1.5 ml-0.5">
      <Ionicons name={icon} size={16} color={colors.muted} />
    </Pressable>
  );
});

interface MediaRowFavouriteButtonProps {
  isFavourite: boolean;
  onToggle: () => void;
}

const MediaRowFavouriteButton = memo(function MediaRowFavouriteButton({
  isFavourite,
  onToggle,
}: MediaRowFavouriteButtonProps) {
  const handlePress = () => {
    void Haptics.impactAsync(
      isFavourite ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
    );
    onToggle();
  };

  if (!isFavourite) return null;

  return (
    <Pressable onPress={handlePress} hitSlop={8} className="p-1.5">
      <Ionicons name="heart" size={14} color={colors.accent} />
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Smart leading: picks the right indicator based on state
// ---------------------------------------------------------------------------

interface SmartLeadingProps {
  number?: number | null;
  /** Fallback icon when no number and not playing/completed. */
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
}

const MediaRowSmartLeading = memo(function MediaRowSmartLeading({
  number,
  fallbackIcon,
}: SmartLeadingProps) {
  const { isPlaying, isCompleted } = useMediaRow();

  return (
    <MediaRowLeading>
      {isPlaying ? (
        <MediaRowPlayingIndicator />
      ) : isCompleted ? (
        <MediaRowCompletedIcon />
      ) : number ? (
        <MediaRowTrackNumber value={number} />
      ) : fallbackIcon ? (
        <Ionicons name={fallbackIcon} size={16} color={colors.muted} />
      ) : null}
    </MediaRowLeading>
  );
});

// ---------------------------------------------------------------------------
// Preset: Track
// ---------------------------------------------------------------------------

interface TrackPresetProps {
  title: string;
  artistName: string;
  duration: number;
  trackNumber?: number | null;
  isPlaying?: boolean;
  isFavourite?: boolean;
  isDownloaded?: boolean;
  isQueued?: boolean;
  progress?: number;
  isCompleted?: boolean;
  onPress: () => void;
  onMorePress?: () => void;
  onToggleFavourite?: () => void;
}

const MediaRowTrack = memo(function MediaRowTrack(props: TrackPresetProps) {
  return (
    <MediaRowRoot onPress={props.onPress} isPlaying={props.isPlaying} isCompleted={props.isCompleted}>
      <MediaRowSmartLeading number={props.trackNumber} />
      <MediaRowContent title={props.title} subtitle={props.artistName}>
        {props.progress != null ? <MediaRowProgress value={props.progress} /> : null}
      </MediaRowContent>
      {props.isDownloaded ? (
        <MediaRowDownloadBadge />
      ) : props.isQueued ? (
        <MediaRowQueuedBadge queued />
      ) : null}
      {props.isFavourite && props.onToggleFavourite ? (
        <MediaRowFavouriteButton isFavourite onToggle={props.onToggleFavourite} />
      ) : null}
      <MediaRowDuration seconds={props.duration} />
      {props.onMorePress ? <MediaRowMoreButton onPress={props.onMorePress} /> : null}
    </MediaRowRoot>
  );
});

// ---------------------------------------------------------------------------
// Preset: Episode
// ---------------------------------------------------------------------------

interface EpisodePresetProps {
  title: string;
  dateLabel: string;
  duration: number;
  episodeNumber?: number | null;
  isPlaying?: boolean;
  isDownloaded?: boolean;
  progress?: number;
  isCompleted?: boolean;
  onPress: () => void;
  onMorePress?: () => void;
}

const MediaRowEpisode = memo(function MediaRowEpisode(props: EpisodePresetProps) {
  return (
    <MediaRowRoot onPress={props.onPress} isPlaying={props.isPlaying} isCompleted={props.isCompleted}>
      <MediaRowSmartLeading number={props.episodeNumber} fallbackIcon="mic-outline" />
      <MediaRowContent title={props.title} subtitle={props.dateLabel}>
        {props.progress != null ? <MediaRowProgress value={props.progress} /> : null}
      </MediaRowContent>
      {props.isDownloaded ? <MediaRowDownloadBadge /> : null}
      <MediaRowDuration
        seconds={props.duration}
        remaining
        progress={props.progress}
        isCompleted={props.isCompleted}
      />
      {props.onMorePress ? (
        <MediaRowMoreButton onPress={props.onMorePress} icon="ellipsis-vertical" />
      ) : null}
    </MediaRowRoot>
  );
});

// ---------------------------------------------------------------------------
// Preset: Chapter
// ---------------------------------------------------------------------------

interface ChapterPresetProps {
  title: string;
  artistName?: string;
  duration: number;
  chapterNumber?: number | null;
  isPlaying?: boolean;
  isDownloaded?: boolean;
  progress?: number;
  isCompleted?: boolean;
  onPress: () => void;
}

const MediaRowChapter = memo(function MediaRowChapter(props: ChapterPresetProps) {
  return (
    <MediaRowRoot onPress={props.onPress} isPlaying={props.isPlaying} isCompleted={props.isCompleted}>
      <MediaRowSmartLeading number={props.chapterNumber} />
      <MediaRowContent title={props.title} subtitle={props.artistName}>
        {props.progress != null ? <MediaRowProgress value={props.progress} /> : null}
      </MediaRowContent>
      {props.isDownloaded ? <MediaRowDownloadBadge /> : null}
      <MediaRowDuration
        seconds={props.duration}
        remaining
        progress={props.progress}
        isCompleted={props.isCompleted}
      />
    </MediaRowRoot>
  );
});

// ---------------------------------------------------------------------------
// Compound export
// ---------------------------------------------------------------------------

export const MediaRow = Object.assign(MediaRowRoot, {
  Leading: MediaRowLeading,
  Content: MediaRowContent,
  Trailing: MediaRowTrailing,
  TrackNumber: MediaRowTrackNumber,
  PlayingIndicator: MediaRowPlayingIndicator,
  CompletedIcon: MediaRowCompletedIcon,
  SmartLeading: MediaRowSmartLeading,
  Progress: MediaRowProgress,
  DownloadBadge: MediaRowDownloadBadge,
  QueuedBadge: MediaRowQueuedBadge,
  Duration: MediaRowDuration,
  MoreButton: MediaRowMoreButton,
  FavouriteButton: MediaRowFavouriteButton,
  Track: MediaRowTrack,
  Episode: MediaRowEpisode,
  Chapter: MediaRowChapter,
});
