import { useCallback, useMemo } from "react";
import { View, Text, useWindowDimensions } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAudiobooks } from "@/src/hooks/audiobooks/audiobooks";
import type { EnrichedAudiobook } from "@/src/hooks/audiobooks/audiobooks";

import { BookGrid } from "@/src/components/media/book-grid";
import { MediaCard } from "@/src/components/data-display/data-display";
import { EmptyState } from "@/src/components/feedback/feedback";
import { SectionHeader, HorizontalList } from "@/src/components/layout/layout";

export default function AudiobooksScreen() {
  const { audiobooks, loading } = useAudiobooks();
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

  const hasFavourites = favourites.length > 0;

  const listHeader = (
    <View>
      <View className="px-4">
        <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
          Audiobooks
        </Text>
      </View>

      {hasFavourites && (
        <View className="mb-4">
          <SectionHeader title="Favourites" />
          <HorizontalList
            data={favourites}
            keyExtractor={(item) => item.id}
            renderItem={renderBookCard}
            itemWidth={gridCardWidth}
          />
        </View>
      )}

      {hasFavourites && (
        <View className="mb-2">
          <SectionHeader title="All Books" />
        </View>
      )}
    </View>
  );

  if (!loading && audiobooks.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-fermata-bg" edges={["top"]}>
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
    <SafeAreaView className="flex-1 bg-fermata-bg" edges={["top"]}>
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
