import { memo } from "react";
import { View, Text } from "react-native";

import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { resolveArtworkUrl } from "@/src/features/artwork/artwork";

import { PressableScale } from "@/src/shared/components/pressable-scale";
import { colors } from "@/src/shared/theme/theme";

interface ArtistRowProps {
  name: string;
  sourceId: string;
  artworkSourceItemId: string | null;
  onPress: () => void;
}

export const ArtistRow = memo(function ArtistRow({
  name,
  sourceId,
  artworkSourceItemId,
  onPress,
}: ArtistRowProps) {
  const artworkUrl = resolveArtworkUrl(sourceId, artworkSourceItemId, "small");

  return (
    <PressableScale
      onPress={onPress}
      scaleValue={0.98}
    >
      <View className="flex-row items-center py-3 px-1">
        <View className="w-12 h-12 rounded-full bg-fermata-surface overflow-hidden">
          {artworkUrl ? (
            <Image
              source={{ uri: artworkUrl }}
              style={{ width: 48, height: 48 }}
              contentFit="cover"
              cachePolicy="disk"
              recyclingKey={artworkUrl}
              transition={200}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="person" size={22} color={colors.muted} />
            </View>
          )}
        </View>
        <Text className="text-fermata-text text-base font-medium ml-4 flex-1" numberOfLines={1}>
          {name}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
    </PressableScale>
  );
});
