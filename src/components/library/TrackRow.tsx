import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "@/src/theme";
import { formatDuration } from "@/src/lib/utils";

interface TrackRowProps {
  title: string;
  artistName: string;
  duration: number; // seconds
  trackNumber?: number | null;
  isPlaying?: boolean;
  isFavourite?: boolean;
  isDownloaded?: boolean;
  isQueued?: boolean;
  onPress: () => void;
  onMorePress?: () => void;
  onToggleFavourite?: () => void;
}

export function TrackRow({
  title,
  artistName,
  duration,
  trackNumber,
  isPlaying,
  isFavourite,
  isDownloaded,
  isQueued,
  onPress,
  onMorePress,
  onToggleFavourite,
}: TrackRowProps) {
  const handleToggleFavourite = () => {
    Haptics.impactAsync(
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
      {/* Track number or playing indicator */}
      <View style={{ width: 32, alignItems: "center" }}>
        {isPlaying ? (
          <Ionicons name="volume-high" size={16} color={colors.accent} />
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
            color: isPlaying ? colors.accent : colors.text,
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
}

// Re-export for backwards compat
export { formatDuration } from "@/src/lib/utils";
