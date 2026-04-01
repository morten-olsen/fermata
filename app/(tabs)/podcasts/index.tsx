import { useCallback, useMemo, useState } from "react";
import { View, Text } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";

import {
  useLibraryStore,
  AlbumGrid,
  ShowCard,
} from "@/src/features/library/library";
import type { AlbumRow } from "@/src/features/library/library";

import { SectionHeader } from "@/src/shared/components/section-header";
import { HorizontalList } from "@/src/shared/components/horizontal-list";
import { EmptyState } from "@/src/shared/components/empty-state";
import { colors } from "@/src/shared/theme/theme";

export default function PodcastsScreen() {
  const albums = useLibraryStore((s) => s.albums);
  const stats = useLibraryStore((s) => s.stats);
  const setMediaType = useLibraryStore((s) => s.setMediaType);
  const getInProgressAlbums = useLibraryStore((s) => s.getInProgressAlbums);

  const [recent, setRecent] = useState<AlbumRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      setMediaType("podcast");
      void getInProgressAlbums("podcast").then(setRecent);
    }, [setMediaType, getInProgressAlbums]),
  );

  const handleShowPress = useCallback(
    (id: string) =>
      router.push({ pathname: "/(tabs)/podcasts/show/[id]", params: { id } }),
    [],
  );

  const renderHorizontalCard = useCallback(
    (item: AlbumRow) => (
      <ShowCard
        id={item.id}
        title={item.title}
        artistName={item.artistName}
        sourceId={item.sourceId}
        artworkSourceItemId={item.artworkSourceItemId}
        onPress={() => handleShowPress(item.id)}
      />
    ),
    [handleShowPress],
  );

  const listHeader = useMemo(() => (
    <View>
      <View className="px-4">
        <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
          Podcasts
        </Text>
      </View>

      {recent.length > 0 && (
        <View className="mb-6">
          <SectionHeader title="Recent" />
          <HorizontalList
            data={recent}
            keyExtractor={(item) => item.id}
            renderItem={renderHorizontalCard}
          />
        </View>
      )}

      {recent.length > 0 && (
        <SectionHeader title="All Shows" />
      )}
    </View>
  ), [recent, renderHorizontalCard]);

  if (stats.podcasts === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        <View className="px-4">
          <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
            Podcasts
          </Text>
        </View>
        <EmptyState
          icon="mic-outline"
          title="No podcasts yet"
          subtitle="Connect an Audiobookshelf source in Settings to sync your podcasts"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <AlbumGrid
        style={{ flex: 1 }}
        albums={albums}
        onAlbumPress={handleShowPress}
        ListHeaderComponent={listHeader}
      />
    </SafeAreaView>
  );
}
