import { memo } from "react";
import { View, Text, Pressable } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { EqualizerBars } from "@/src/features/playback/playback";

import { ProgressBar } from "@/src/shared/components/progress-bar";
import { colors } from "@/src/shared/theme/theme";
import { formatRemainingDuration } from "@/src/shared/lib/format";

interface ChapterRowProps {
  title: string;
  artistName: string;
  duration: number; // seconds
  chapterNumber?: number | null;
  isPlaying?: boolean;
  isDownloaded?: boolean;
  /** Progress 0–1. undefined = not started. */
  progress?: number;
  /** Whether the chapter has been fully played. */
  isCompleted?: boolean;
  onPress: () => void;
}

export const ChapterRow = memo(function ChapterRow({
  title,
  artistName,
  duration,
  chapterNumber,
  isPlaying,
  isDownloaded,
  progress,
  isCompleted,
  onPress,
}: ChapterRowProps) {
  const hasPartialProgress = progress != null && progress > 0 && !isCompleted;

  return (
    <Pressable onPress={onPress} className="flex-row items-center py-3 px-1">
      <View className="w-8 items-center">
        {isPlaying ? (
          <EqualizerBars size={16} color={colors.accent} />
        ) : isCompleted ? (
          <Ionicons name="checkmark-circle" size={18} color={colors.muted} />
        ) : chapterNumber ? (
          <Text className="text-fermata-muted text-sm">{chapterNumber}</Text>
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
