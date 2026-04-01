import { memo } from "react";
import { View, Text, Pressable } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { EqualizerBars } from "@/src/features/playback/playback";

import { ProgressBar } from "@/src/shared/components/progress-bar";
import { colors } from "@/src/shared/theme/theme";
import { formatDuration } from "@/src/shared/lib/format";

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
        ) : episodeNumber ? (
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            {episodeNumber}
          </Text>
        ) : (
          <Ionicons name="mic-outline" size={16} color={colors.muted} />
        )}
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
          {dateLabel}
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
        {formatDuration(duration)}
      </Text>
    </Pressable>
  );
});
