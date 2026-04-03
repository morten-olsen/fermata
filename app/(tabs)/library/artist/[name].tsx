import { View, Text, Pressable } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AlbumGrid } from "@/src/components/media/album-grid";
import { useAlbumsByArtist } from "@/src/hooks/albums/albums";

import { colors } from "@/src/shared/theme/theme";

export default function ArtistDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { albums } = useAlbumsByArtist(name);

  const header = (
    <View style={{ marginBottom: 16 }}>
      <Pressable onPress={() => router.back()} style={{ paddingVertical: 12 }}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <Text className="text-3xl font-bold text-fermata-text mb-1">{name}</Text>
      <Text className="text-fermata-text-secondary text-sm mb-6">
        {albums.length} {albums.length === 1 ? "album" : "albums"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0B" }} edges={["top"]}>
      <AlbumGrid
        style={{ flex: 1 }}
        albums={albums}
        onAlbumPress={(id) =>
          router.push({
            pathname: "/(tabs)/library/album/[id]",
            params: { id },
          })
        }
        ListHeaderComponent={header}
      />
    </SafeAreaView>
  );
}
