import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { resolveArtworkUrl } from "@/src/lib/artwork";
import { colors } from "@/src/theme";

interface AlbumCardProps {
  id: string;
  title: string;
  artistName: string;
  year?: number | null;
  sourceId: string;
  artworkSourceItemId: string | null;
  onPress: () => void;
}

export function AlbumCard({
  title,
  artistName,
  year,
  sourceId,
  artworkSourceItemId,
  onPress,
}: AlbumCardProps) {
  const artworkUrl = resolveArtworkUrl(sourceId, artworkSourceItemId);

  return (
    <Pressable onPress={onPress} className="mb-4">
      <View className="aspect-square rounded-xl bg-fermata-surface overflow-hidden mb-2">
        {artworkUrl ? (
          <Image
            source={{ uri: artworkUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="disc" size={40} color={colors.muted} />
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
    </Pressable>
  );
}
