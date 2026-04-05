import { useCallback, useMemo } from "react";
import { View, Text, useWindowDimensions } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AlbumGrid } from "@/src/components/media/album-grid";
import { EpisodeCard } from "@/src/components/media/episode-card";
import { ShowCard } from "@/src/components/media/show-card";
import { useShows, useLatestUnplayed } from "@/src/hooks/shows/shows";
import type { EnrichedLatestEpisode } from "@/src/hooks/shows/shows";
import { usePlayTracks } from "@/src/hooks/playback/playback";
import { useLibraryStats } from "@/src/hooks/library/library";
import type { ShowRow } from "@/src/services/database/database.schemas";

import { EmptyState } from "@/src/shared/components/empty-state";
import { HorizontalList } from "@/src/shared/components/horizontal-list";
import { colors } from "@/src/shared/theme/theme";

export default function PodcastsScreen() {
  const { shows } = useShows();
  const { episodes: latestEpisodes } = useLatestUnplayed();
  const { mutate: playTracks } = usePlayTracks();
  const stats = useLibraryStats();
  const { width: screenWidth } = useWindowDimensions();
  const gridCardWidth = Math.floor((screenWidth - 16 - 36 - 12 * 2) / 3);

  const favourites = useMemo(
    () => shows.filter((s) => !!s.isFavourite),
    [shows],
  );

  const handleShowPress = useCallback(
    (id: string) =>
      router.push({ pathname: "/(tabs)/podcasts/show/[id]", params: { id } }),
    [],
  );

  const handleEpisodePress = useCallback(
    (episodeId: string) => {
      void playTracks({ trackIds: [episodeId] });
    },
    [playTracks],
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

  const renderLatestCard = useCallback(
    (item: EnrichedLatestEpisode) => (
      <EpisodeCard
        title={item.title}
        showTitle={item.showTitle}
        artworkUri={item.showArtworkUri}
        onPress={() => handleEpisodePress(item.id)}
      />
    ),
    [handleEpisodePress],
  );

  const listHeader = (
    <View>
      <View className="px-4">
        <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
          Podcasts
        </Text>
      </View>

      {latestEpisodes.length > 0 && (
        <View className="mb-4">
          <Text className="text-lg font-semibold text-fermata-text px-4 mb-2">
            Latest
          </Text>
          <HorizontalList
            data={latestEpisodes}
            keyExtractor={(item) => item.id}
            renderItem={renderLatestCard}
            itemWidth={gridCardWidth}
          />
        </View>
      )}

      {favourites.length > 0 && (
        <View className="mb-4">
          <Text className="text-lg font-semibold text-fermata-text px-4 mb-2">
            Favourites
          </Text>
          <HorizontalList
            data={favourites}
            keyExtractor={(item) => item.id}
            renderItem={renderFavouriteCard}
            itemWidth={gridCardWidth}
          />
        </View>
      )}

      <View className="h-px bg-fermata-border mx-4 mt-2 mb-8" />
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
        columns={3}
        ListHeaderComponent={listHeader}
      />
    </SafeAreaView>
  );
}
