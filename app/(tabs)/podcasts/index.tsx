import { useCallback, useMemo } from "react";
import { View, Text, useWindowDimensions } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useShows, useLatestUnplayed } from "@/src/hooks/shows/shows";
import type { EnrichedLatestEpisode } from "@/src/hooks/shows/shows";
import { usePlayTracks } from "@/src/hooks/playback/playback";
import type { ShowRow } from "@/src/services/database/database.schemas";

import { MediaCard } from "@/src/components/data-display/data-display";
import { EpisodeCard } from "@/src/components/media/episode-card";
import { AlbumGrid } from "@/src/components/media/album-grid";
import { EmptyState } from "@/src/components/feedback/feedback";
import { SectionHeader, HorizontalList } from "@/src/components/layout/layout";

export default function PodcastsScreen() {
  const { shows, loading } = useShows();
  const { episodes: latestEpisodes } = useLatestUnplayed();
  const { mutate: playTracks } = usePlayTracks();
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
      <MediaCard.Show
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

  const hasHorizontalSections = latestEpisodes.length > 0 || favourites.length > 0;

  const listHeader = (
    <View>
      <View className="px-4">
        <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
          Podcasts
        </Text>
      </View>

      {latestEpisodes.length > 0 && (
        <View className="mb-4">
          <SectionHeader title="Latest" />
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
          <SectionHeader title="Favourites" />
          <HorizontalList
            data={favourites}
            keyExtractor={(item) => item.id}
            renderItem={renderShowCard}
            itemWidth={gridCardWidth}
          />
        </View>
      )}

      {hasHorizontalSections && (
        <View className="mb-2">
          <SectionHeader title="All Shows" />
        </View>
      )}
    </View>
  );

  if (!loading && shows.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-fermata-bg" edges={["top"]}>
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
    <SafeAreaView className="flex-1 bg-fermata-bg" edges={["top"]}>
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
