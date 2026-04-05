import { memo } from "react";
import { View, Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { SourceArtwork, PressableScale } from "@/src/components/primitives/primitives";

import { colors } from "@/src/shared/theme/theme";

interface ArtistRowProps {
  name: string;
  artworkUri?: string | null;
  onPress: () => void;
}

export const ArtistRow = memo(function ArtistRow({
  name,
  artworkUri,
  onPress,
}: ArtistRowProps) {
  return (
    <PressableScale
      onPress={onPress}
      scaleValue={0.98}
    >
      <View className="flex-row items-center py-3 px-1">
        <View className="w-12 h-12 rounded-full overflow-hidden">
          <SourceArtwork
            artworkUri={artworkUri}
            size="sm"
            fallbackIcon="person"
          />
        </View>
        <Text className="text-fermata-text text-base font-medium ml-4 flex-1" numberOfLines={1}>
          {name}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
    </PressableScale>
  );
});
