import { useCallback, useMemo } from "react";
import { View, Text } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AlbumGrid } from "@/src/components/media/album-grid";
import { ShowCard } from "@/src/components/media/show-card";
import { useShows } from "@/src/hooks/shows/shows";
import { useLibraryStats } from "@/src/hooks/library/library";
import type { ShowRow } from "@/src/services/database/database.schemas";

import { EmptyState } from "@/src/shared/components/empty-state";
import { HorizontalList } from "@/src/shared/components/horizontal-list";
import { colors } from "@/src/shared/theme/theme";

export default function PodcastsScreen() {
  const { shows } = useShows();
  const stats = useLibraryStats();

  const favourites = useMemo(
    () => shows.filter((s) => !!s.isFavourite),
    [shows],
  );

  const handleShowPress = useCallback(
    (id: string) =>
      router.push({ pathname: "/(tabs)/podcasts/show/[id]", params: { id } }),
    [],
  );

  const renderShowCard = useCallback(
    (item: ShowRow) => (
      <ShowCard
        id={item.id}
        title={item.title}
        artistName={item.authorName ?? "Unknown"}
        episodeCount={item.episodeCount ?? undefined}
        artworkUri={item.artworkUri}
        onPress={() => handleShowPress(item.id)}
      />
    ),
    [handleShowPress],
  );

  const renderFavouriteCard = useCallback(
    (item: ShowRow) => (
      <ShowCard
        id={item.id}
        title={item.title}
        artistName={item.authorName ?? "Unknown"}
        episodeCount={item.episodeCount ?? undefined}
        artworkUri={item.artworkUri}
        onPress={() => handleShowPress(item.id)}
      />
    ),
    [handleShowPress],
  );

  const listHeader = (
    <View>
      <View className="px-4">
        <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
          Podcasts
        </Text>
      </View>

      {favourites.length > 0 && (
        <View className="mb-4">
          <Text className="text-lg font-semibold text-fermata-text px-4 mb-2">
            Favourites
          </Text>
          <HorizontalList
            data={favourites}
            keyExtractor={(item) => item.id}
            renderItem={renderFavouriteCard}
            itemWidth={130}
          />
        </View>
      )}
    </View>
  );

  if (stats.shows === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        {listHeader}
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
        albums={shows}
        onAlbumPress={handleShowPress}
        renderCard={renderShowCard}
        ListHeaderComponent={listHeader}
      />
    </SafeAreaView>
  );
}
