import { memo } from "react";
import { View, Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { resolveArtworkUrl } from "@/src/features/artwork/artwork";

import { Artwork } from "@/src/shared/components/artwork";
import { PressableScale } from "@/src/shared/components/pressable-scale";
import { colors } from "@/src/shared/theme/theme";

interface AlbumCardProps {
  id: string;
  title: string;
  artistName: string;
  year?: number | null;
  sourceId: string;
  artworkSourceItemId: string | null;
  isDownloaded?: boolean;
  onPress: () => void;
}

export const AlbumCard = memo(function AlbumCard({
  title,
  artistName,
  year,
  sourceId,
  artworkSourceItemId,
  isDownloaded,
  onPress,
}: AlbumCardProps) {
  const artworkUrl = resolveArtworkUrl(sourceId, artworkSourceItemId);

  const badge = isDownloaded ? (
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
      <Artwork uri={artworkUrl} aspect="square" fill fallbackIcon="disc" badge={badge} />
      <Text className="text-fermata-text text-sm font-medium mt-2" numberOfLines={1}>
        {title}
      </Text>
      <Text className="text-fermata-text-secondary text-xs" numberOfLines={1}>
        {artistName}
        {year ? ` · ${year}` : ""}
      </Text>
    </PressableScale>
  );
});
