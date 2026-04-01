import { memo } from "react";
import { View, Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { resolveArtworkUrl } from "@/src/features/artwork/artwork";

import { Artwork } from "@/src/shared/components/artwork";
import { PressableScale } from "@/src/shared/components/pressable-scale";
import { colors } from "@/src/shared/theme/theme";

interface ShowCardProps {
  id: string;
  title: string;
  artistName: string;
  episodeCount?: number;
  sourceId: string;
  artworkSourceItemId: string | null;
  /** Whether the show has unplayed episodes. */
  hasNew?: boolean;
  onPress: () => void;
}

export const ShowCard = memo(function ShowCard({
  title,
  artistName,
  episodeCount,
  sourceId,
  artworkSourceItemId,
  hasNew,
  onPress,
}: ShowCardProps) {
  const artworkUrl = resolveArtworkUrl(sourceId, artworkSourceItemId);

  const badge = episodeCount != null ? (
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
      <Ionicons name="mic" size={10} color={colors.textSecondary} />
      <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: "600" }}>
        {episodeCount}
      </Text>
    </View>
  ) : undefined;

  return (
    <PressableScale onPress={onPress} className="mb-4">
      <View style={{ position: "relative" }}>
        <Artwork uri={artworkUrl} aspect="square" fill fallbackIcon="mic" badge={badge} />
        {hasNew && (
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
        )}
      </View>
      <Text className="text-fermata-text text-sm font-medium mt-2" numberOfLines={1}>
        {title}
      </Text>
      <Text className="text-fermata-text-secondary text-xs" numberOfLines={1}>
        {artistName}
      </Text>
    </PressableScale>
  );
});
