import { memo } from "react";
import { View, Text, Pressable } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { EqualizerBars } from "@/src/features/playback/playback";

import { ProgressBar } from "@/src/shared/components/progress-bar";
import { colors } from "@/src/shared/theme/theme";
import { formatDuration } from "@/src/shared/lib/format";

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
  // Show remaining duration if partially complete
  const displayDuration =
    progress != null && progress > 0 && !isCompleted
      ? Math.round(duration * (1 - progress))
      : duration;
  const durationPrefix =
    progress != null && progress > 0 && !isCompleted ? "-" : "";

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 4,
      }}
    >
      <View style={{ width: 32, alignItems: "center" }}>
        {isPlaying ? (
          <EqualizerBars size={16} color={colors.accent} />
        ) : isCompleted ? (
          <Ionicons name="checkmark-circle" size={18} color={colors.muted} />
        ) : chapterNumber ? (
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            {chapterNumber}
          </Text>
        ) : null}
      </View>

      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "500",
            color: isPlaying
              ? colors.accent
              : isCompleted
                ? colors.muted
                : colors.text,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={{ color: colors.textSecondary, fontSize: 12 }}
          numberOfLines={1}
        >
          {artistName}
        </Text>
        {progress != null && progress > 0 && !isCompleted && (
          <View style={{ marginTop: 4 }}>
            <ProgressBar value={progress} />
          </View>
        )}
      </View>

      {isDownloaded && (
        <Ionicons
          name="cloud-done"
          size={12}
          color={colors.muted}
          style={{ marginLeft: 4 }}
        />
      )}

      <Text style={{ color: colors.muted, fontSize: 14, marginLeft: 8 }}>
        {durationPrefix}{formatDuration(displayDuration)}
      </Text>
    </Pressable>
  );
});
