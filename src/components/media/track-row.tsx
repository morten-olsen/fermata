import { memo } from "react";
import { View, Text, Pressable } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { EqualizerBars } from "@/src/features/playback/playback";

import { ProgressBar } from "@/src/shared/components/progress-bar";
import { colors } from "@/src/shared/theme/theme";
import { formatDuration } from "@/src/shared/lib/format";

interface TrackRowProps {
  title: string;
  artistName: string;
  duration: number; // seconds
  trackNumber?: number | null;
  isPlaying?: boolean;
  isFavourite?: boolean;
  isDownloaded?: boolean;
  isQueued?: boolean;
  /** Progress 0–1 for podcast/audiobook tracks. undefined = no progress. */
  progress?: number;
  /** Whether the track has been fully played */
  isCompleted?: boolean;
  onPress: () => void;
  onMorePress?: () => void;
  onToggleFavourite?: () => void;
}

export const TrackRow = memo(function TrackRow({
  title,
  artistName,
  duration,
  trackNumber,
  isPlaying,
  isFavourite,
  isDownloaded,
  isQueued,
  progress,
  isCompleted,
  onPress,
  onMorePress,
  onToggleFavourite,
}: TrackRowProps) {
  const handleToggleFavourite = () => {
    void Haptics.impactAsync(
      isFavourite
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );
    onToggleFavourite?.();
  };

  return (
    <Pressable onPress={onPress} className="flex-row items-center py-3 px-1">
      <View className="w-8 items-center">
        {isPlaying ? (
          <EqualizerBars size={16} color={colors.accent} />
        ) : isCompleted ? (
          <Ionicons name="checkmark-circle" size={18} color={colors.muted} />
        ) : trackNumber ? (
          <Text className="text-fermata-muted text-sm">{trackNumber}</Text>
        ) : null}
      </View>

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
        <Text className="text-fermata-text-secondary text-xs" numberOfLines={1}>
          {artistName}
        </Text>
        {progress != null && progress > 0 && !isCompleted && (
          <View className="mt-1">
            <ProgressBar value={progress} />
          </View>
        )}
      </View>

      {isDownloaded ? (
        <Ionicons name="cloud-done" size={12} color={colors.muted} style={{ marginLeft: 4 }} />
      ) : isQueued ? (
        <Ionicons name="cloud-download-outline" size={12} color={colors.border} style={{ marginLeft: 4 }} />
      ) : null}

      {isFavourite && onToggleFavourite && (
        <Pressable onPress={handleToggleFavourite} hitSlop={8} className="p-1.5">
          <Ionicons name="heart" size={14} color={colors.accent} />
        </Pressable>
      )}

      <Text className="text-fermata-muted text-sm ml-1">
        {formatDuration(duration)}
      </Text>

      {onMorePress && (
        <Pressable onPress={onMorePress} hitSlop={8} className="p-1.5 ml-0.5">
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.muted} />
        </Pressable>
      )}
    </Pressable>
  );
});
