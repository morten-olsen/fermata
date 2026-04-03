import { memo } from "react";
import { View, Text, Pressable } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { EqualizerBars } from "@/src/features/playback/playback";

import { ProgressBar } from "@/src/shared/components/progress-bar";
import { colors } from "@/src/shared/theme/theme";
import { formatRemainingDuration } from "@/src/shared/lib/format";

interface EpisodeRowProps {
  title: string;
  /** Formatted date string (e.g. "Mar 15, 2025"). */
  dateLabel: string;
  duration: number; // seconds
  episodeNumber?: number | null;
  isPlaying?: boolean;
  isDownloaded?: boolean;
  /** Progress 0–1. undefined = no progress. */
  progress?: number;
  /** Whether the episode has been fully played. */
  isCompleted?: boolean;
  onPress: () => void;
}

export const EpisodeRow = memo(function EpisodeRow({
  title,
  dateLabel,
  duration,
  episodeNumber,
  isPlaying,
  isDownloaded,
  progress,
  isCompleted,
  onPress,
}: EpisodeRowProps) {
  const hasPartialProgress = progress != null && progress > 0 && !isCompleted;

  return (
    <Pressable onPress={onPress} className="flex-row items-center py-3 px-1">
      <View className="w-8 items-center">
        {isPlaying ? (
          <EqualizerBars size={16} color={colors.accent} />
        ) : isCompleted ? (
          <Ionicons name="checkmark-circle" size={18} color={colors.muted} />
        ) : episodeNumber ? (
          <Text className="text-fermata-muted text-sm">{episodeNumber}</Text>
        ) : (
          <Ionicons name="mic-outline" size={16} color={colors.muted} />
        )}
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
          {dateLabel}
        </Text>
        {hasPartialProgress && (
          <View className="mt-1">
            <ProgressBar value={progress} />
          </View>
        )}
      </View>

      {isDownloaded && (
        <Ionicons name="cloud-done" size={12} color={colors.muted} style={{ marginLeft: 4 }} />
      )}

      <Text className="text-fermata-muted text-sm ml-2">
        {formatRemainingDuration(duration, progress, isCompleted)}
      </Text>
    </Pressable>
  );
});
