import { useCallback, useMemo, useState } from "react";
import { View, Text } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";

import {
  useLibraryStore,
  BookCard,
  BookGrid,
} from "@/src/features/library/library";
import type { AlbumRow } from "@/src/features/library/library";
import { getAlbumProgressSummaries } from "@/src/features/progress/progress";

import { SectionHeader } from "@/src/shared/components/section-header";
import { HorizontalList } from "@/src/shared/components/horizontal-list";
import { EmptyState } from "@/src/shared/components/empty-state";
import { colors } from "@/src/shared/theme/theme";

export default function AudiobooksScreen() {
  const albums = useLibraryStore((s) => s.albums);
  const stats = useLibraryStore((s) => s.stats);
  const setMediaType = useLibraryStore((s) => s.setMediaType);
  const getFavouriteAlbums = useLibraryStore((s) => s.getFavouriteAlbums);
  const getInProgressAlbums = useLibraryStore((s) => s.getInProgressAlbums);

  const [favourites, setFavourites] = useState<AlbumRow[]>([]);
  const [inProgress, setInProgress] = useState<AlbumRow[]>([]);
  const [finished, setFinished] = useState<AlbumRow[]>([]);
  const [progressMap, setProgressMap] = useState(() => new Map<string, number>());

  useFocusEffect(
    useCallback(() => {
      setMediaType("audiobook");
      void getFavouriteAlbums("audiobook").then(setFavourites);
      void getInProgressAlbums("audiobook").then(setInProgress);
    }, [setMediaType, getFavouriteAlbums, getInProgressAlbums]),
  );

  // Load per-album progress summaries once albums are available
  useFocusEffect(
    useCallback(() => {
      if (albums.length === 0) return;
      const ids = albums.map((a) => a.id);
      void getAlbumProgressSummaries(ids).then((summaries) => {
        const pMap = new Map<string, number>();
        const done: AlbumRow[] = [];
        for (const album of albums) {
          const s = summaries.get(album.id);
          if (s) {
            pMap.set(album.id, s.fraction);
            if (s.fraction >= 1 && s.total > 0) {
              done.push(album);
            }
          }
        }
        setProgressMap(pMap);
        setFinished(done);
      });
    }, [albums]),
  );

  const handleBookPress = useCallback(
    (id: string) =>
      router.push({ pathname: "/(tabs)/audiobooks/book/[id]", params: { id } }),
    [],
  );

  const renderHorizontalCard = useCallback(
    (item: AlbumRow) => (
      <BookCard
        id={item.id}
        title={item.title}
        artistName={item.artistName}
        sourceId={item.sourceId}
        artworkSourceItemId={item.artworkSourceItemId}
        progress={progressMap.get(item.id)}
        onPress={() => handleBookPress(item.id)}
      />
    ),
    [handleBookPress, progressMap],
  );

  const hasSections = inProgress.length > 0 || favourites.length > 0 || finished.length > 0;

  const listHeader = useMemo(() => (
    <View>
      <View className="px-4">
        <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
          Audiobooks
        </Text>
      </View>

      {inProgress.length > 0 && (
        <View className="mb-6">
          <SectionHeader title="Currently Listening" />
          <HorizontalList
            data={inProgress}
            keyExtractor={(item) => item.id}
            renderItem={renderHorizontalCard}
          />
        </View>
      )}

      {favourites.length > 0 && (
        <View className="mb-6">
          <SectionHeader title="Favourites" />
          <HorizontalList
            data={favourites}
            keyExtractor={(item) => item.id}
            renderItem={renderHorizontalCard}
          />
        </View>
      )}

      {finished.length > 0 && (
        <View className="mb-6">
          <SectionHeader title="Finished" />
          <HorizontalList
            data={finished}
            keyExtractor={(item) => item.id}
            renderItem={renderHorizontalCard}
          />
        </View>
      )}

      {hasSections && (
        <SectionHeader title="All Audiobooks" />
      )}
    </View>
  ), [inProgress, favourites, finished, hasSections, renderHorizontalCard]);

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
      <BookGrid
        style={{ flex: 1 }}
        books={albums}
        onBookPress={handleBookPress}
        progressMap={progressMap}
        ListHeaderComponent={listHeader}
      />
    </SafeAreaView>
  );
}
