import { useCallback, useMemo } from "react";
import { View, Text, useWindowDimensions } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAudiobooks } from "@/src/hooks/audiobooks/audiobooks";
import type { EnrichedAudiobook } from "@/src/hooks/audiobooks/audiobooks";
import { useLibraryStats } from "@/src/hooks/library/library";

import { BookGrid } from "@/src/components/media/book-grid";
import { MediaCard } from "@/src/components/data-display/data-display";
import { EmptyState } from "@/src/components/feedback/feedback";
import { HorizontalList } from "@/src/components/layout/layout";

import { colors } from "@/src/shared/theme/theme";

export default function AudiobooksScreen() {
  const { audiobooks } = useAudiobooks();
  const stats = useLibraryStats();
  const { width: screenWidth } = useWindowDimensions();
  const gridCardWidth = Math.floor((screenWidth - 16 - 36 - 12 * 2) / 3);

  const favourites = useMemo(
    () => audiobooks.filter((b) => !!b.isFavourite),
    [audiobooks],
  );

  const handleBookPress = useCallback(
    (id: string) =>
      router.push({ pathname: "/(tabs)/audiobooks/book/[id]", params: { id } }),
    [],
  );

  const renderBookCard = useCallback(
    (item: EnrichedAudiobook) => (
      <MediaCard.Book
        id={item.id}
        title={item.title}
        artistName={item.authorName}
        artworkUri={item.artworkUri}
        progress={item.progress ?? undefined}
        isDownloaded={item.isDownloaded}
        onPress={() => handleBookPress(item.id)}
      />
    ),
    [handleBookPress],
  );

  const renderFavouriteCard = useCallback(
    (item: EnrichedAudiobook) => (
      <MediaCard.Book
        id={item.id}
        title={item.title}
        artistName={item.authorName}
        artworkUri={item.artworkUri}
        progress={item.progress ?? undefined}
        isDownloaded={item.isDownloaded}
        onPress={() => handleBookPress(item.id)}
      />
    ),
    [handleBookPress],
  );

  const listHeader = (
    <View>
      <View className="px-4">
        <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
          Audiobooks
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
            itemWidth={gridCardWidth}
          />
        </View>
      )}

      <View className="h-px bg-fermata-border mx-4 mt-2 mb-8" />
    </View>
  );

  if (stats.audiobooks === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        {listHeader}
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
      <BookGrid
        style={{ flex: 1 }}
        books={audiobooks}
        onBookPress={handleBookPress}
        renderCard={renderBookCard}
        ListHeaderComponent={listHeader}
      />
    </SafeAreaView>
  );
}
