import { memo } from "react";
import { View, Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { resolveArtworkUrl } from "@/src/features/artwork/artwork";

import { Artwork } from "@/src/shared/components/artwork";
import { PressableScale } from "@/src/shared/components/pressable-scale";
import { colors } from "@/src/shared/theme/theme";

interface BookCardProps {
  id: string;
  title: string;
  artistName: string;
  sourceId: string;
  artworkSourceItemId: string | null;
  /** Overall progress 0–1. undefined = not started. */
  progress?: number;
  isDownloaded?: boolean;
  onPress: () => void;
}

export const BookCard = memo(function BookCard({
  title,
  artistName,
  sourceId,
  artworkSourceItemId,
  progress,
  isDownloaded,
  onPress,
}: BookCardProps) {
  const artworkUrl = resolveArtworkUrl(sourceId, artworkSourceItemId);

  const badge =
    progress != null && progress > 0 ? (
      <ProgressBadge progress={progress} />
    ) : isDownloaded ? (
      <View
        style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          borderRadius: 10,
          padding: 3,
        }}
      >
        <Ionicons name="cloud-done" size={12} color={colors.accent} />
      </View>
    ) : undefined;

  return (
    <PressableScale onPress={onPress} className="mb-4">
      <Artwork
        uri={artworkUrl}
        aspect="portrait"
        fallbackIcon="book"
        badge={badge}
      />
      <Text className="text-fermata-text text-sm font-medium mt-2" numberOfLines={1}>
        {title}
      </Text>
      <Text className="text-fermata-text-secondary text-xs" numberOfLines={1}>
        {artistName}
      </Text>
    </PressableScale>
  );
});

/** Compact progress percentage badge. */
function ProgressBadge({ progress }: { progress: number }) {
  const pct = Math.round(Math.min(progress, 1) * 100);

  return (
    <View
      style={{
        backgroundColor: "rgba(0,0,0,0.7)",
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
    >
      <Text
        style={{
          color: colors.accent,
          fontSize: 10,
          fontWeight: "700",
        }}
      >
        {pct}%
      </Text>
    </View>
  );
}
