import { memo } from "react";
import { View, Text } from "react-native";

import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { resolveArtworkUrl } from "@/src/features/artwork/artwork";

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

  return (
    <PressableScale onPress={onPress} className="mb-4">
      <View className="aspect-square rounded-xl bg-fermata-surface overflow-hidden mb-2">
        {artworkUrl ? (
          <Image
            source={{ uri: artworkUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            cachePolicy="disk"
            recyclingKey={artworkUrl}
            transition={200}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="disc" size={40} color={colors.muted} />
          </View>
        )}
        {/* Download indicator */}
        {isDownloaded && (
          <View
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              backgroundColor: "rgba(0,0,0,0.6)",
              borderRadius: 10,
              padding: 3,
            }}
          >
            <Ionicons name="cloud-done" size={12} color={colors.accent} />
          </View>
        )}
      </View>
      <Text className="text-fermata-text text-sm font-medium" numberOfLines={1}>
        {title}
      </Text>
      <Text className="text-fermata-text-secondary text-xs" numberOfLines={1}>
        {artistName}
        {year ? ` · ${year}` : ""}
      </Text>
    </PressableScale>
  );
});
