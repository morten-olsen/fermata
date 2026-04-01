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
    <Pressable
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4 }}
    >
      {/* Track number, playing indicator, or completed checkmark */}
      <View style={{ width: 32, alignItems: "center" }}>
        {isPlaying ? (
          <EqualizerBars size={16} color={colors.accent} />
        ) : isCompleted ? (
          <Ionicons name="checkmark-circle" size={18} color={colors.muted} />
        ) : trackNumber ? (
          <Text style={{ color: colors.muted, fontSize: 14 }}>{trackNumber}</Text>
        ) : null}
      </View>

      {/* Track info */}
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "500",
            color: isPlaying ? colors.accent : isCompleted ? colors.muted : colors.text,
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
        {/* Progress bar for podcast/audiobook tracks */}
        {progress != null && progress > 0 && !isCompleted && (
          <View style={{ marginTop: 4 }}>
            <ProgressBar value={progress} />
          </View>
        )}
      </View>

      {/* Download status indicator */}
      {isDownloaded ? (
        <Ionicons name="cloud-done" size={12} color={colors.muted} style={{ marginLeft: 4 }} />
      ) : isQueued ? (
        <Ionicons name="cloud-download-outline" size={12} color={colors.border} style={{ marginLeft: 4 }} />
      ) : null}

      {/* Favourite heart — only shown when favourited */}
      {isFavourite && onToggleFavourite && (
        <Pressable onPress={handleToggleFavourite} hitSlop={8} style={{ padding: 6 }}>
          <Ionicons name="heart" size={14} color={colors.accent} />
        </Pressable>
      )}

      {/* Duration */}
      <Text style={{ color: colors.muted, fontSize: 14, marginLeft: 4 }}>
        {formatDuration(duration)}
      </Text>

      {/* More button */}
      {onMorePress && (
        <Pressable onPress={onMorePress} hitSlop={8} style={{ padding: 6, marginLeft: 2 }}>
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.muted} />
        </Pressable>
      )}
    </Pressable>
  );
});

// Re-export for backwards compat
export { formatDuration } from "@/src/shared/lib/format";
