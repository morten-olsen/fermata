import { useCallback } from "react";
import { View, Text } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { BookCard } from "@/src/components/media/book-card";
import { BookGrid } from "@/src/components/media/book-grid";

import { useAudiobooks } from "@/src/hooks/audiobooks/audiobooks";
import { useLibraryStats } from "@/src/hooks/library/library";
import type { AudiobookRow } from "@/src/services/database/database.schemas";

import { EmptyState } from "@/src/shared/components/empty-state";
import { colors } from "@/src/shared/theme/theme";

export default function AudiobooksScreen() {
  const { audiobooks } = useAudiobooks();
  const stats = useLibraryStats();

  const handleBookPress = useCallback(
    (id: string) =>
      router.push({ pathname: "/(tabs)/audiobooks/book/[id]", params: { id } }),
    [],
  );

  const renderBookCard = useCallback(
    (item: AudiobookRow) => (
      <BookCard
        id={item.id}
        title={item.title}
        artistName={item.authorName}
        artworkUri={item.artworkUri}
        onPress={() => handleBookPress(item.id)}
      />
    ),
    [handleBookPress],
  );

  const listHeader = (
    <View className="px-4">
      <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
        Audiobooks
      </Text>
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
