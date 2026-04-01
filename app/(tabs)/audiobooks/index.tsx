import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";

import {
  useLibraryStore,
  AlbumCard,
  AlbumGrid,
} from "@/src/features/library/library";
import type { AlbumRow } from "@/src/features/library/library";

import { colors } from "@/src/shared/theme/theme";
import { EmptyState } from "@/src/shared/components/empty-state";

export default function AudiobooksScreen() {
  const albums = useLibraryStore((s) => s.albums);
  const stats = useLibraryStore((s) => s.stats);
  const setMediaType = useLibraryStore((s) => s.setMediaType);
  const getFavouriteAlbums = useLibraryStore((s) => s.getFavouriteAlbums);
  const getInProgressAlbums = useLibraryStore((s) => s.getInProgressAlbums);

  const [favourites, setFavourites] = useState<AlbumRow[]>([]);
  const [inProgress, setInProgress] = useState<AlbumRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      setMediaType("audiobook");
      void getFavouriteAlbums("audiobook").then(setFavourites);
      void getInProgressAlbums("audiobook").then(setInProgress);
    }, [setMediaType, getFavouriteAlbums, getInProgressAlbums]),
  );

  const handleBookPress = useCallback(
    (id: string) =>
      router.push({ pathname: "/(tabs)/audiobooks/book/[id]", params: { id } }),
    [],
  );

  const renderHorizontalCard = useCallback(
    ({ item }: { item: AlbumRow }) => (
      <View style={{ width: 130, marginRight: 12 }}>
        <AlbumCard
          id={item.id}
          title={item.title}
          artistName={item.artistName}
          year={item.year}
          sourceId={item.sourceId}
          artworkSourceItemId={item.artworkSourceItemId}
          onPress={() => handleBookPress(item.id)}
        />
      </View>
    ),
    [handleBookPress],
  );

  const listHeader = useMemo(() => (
    <View>
      <View className="px-4">
        <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
          Audiobooks
        </Text>
      </View>

      {/* Currently Listening */}
      {inProgress.length > 0 && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-fermata-text px-4 mb-3">
            Currently Listening
          </Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={inProgress}
            keyExtractor={(item) => item.id}
            renderItem={renderHorizontalCard}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>
      )}

      {/* Favourites */}
      {favourites.length > 0 && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-fermata-text px-4 mb-3">
            Favourites
          </Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={favourites}
            keyExtractor={(item) => item.id}
            renderItem={renderHorizontalCard}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>
      )}

      {/* "All Audiobooks" section header */}
      {(inProgress.length > 0 || favourites.length > 0) && (
        <Text className="text-lg font-semibold text-fermata-text px-4 mb-3">
          All Audiobooks
        </Text>
      )}
    </View>
  ), [inProgress, favourites, renderHorizontalCard]);

  if (stats.audiobooks === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        <View className="px-4">
          <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
            Audiobooks
          </Text>
        </View>
        <EmptyState
          icon="book-outline"
          title="No audiobooks yet"
          subtitle="Connect an Audiobookshelf source in Settings to sync your audiobooks"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <AlbumGrid
        style={{ flex: 1 }}
        albums={albums}
        onAlbumPress={handleBookPress}
        ListHeaderComponent={listHeader}
      />
    </SafeAreaView>
  );
}
