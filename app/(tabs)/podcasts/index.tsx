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
import { getAlbumProgressSummaries } from "@/src/features/progress/progress";

import { SectionHeader } from "@/src/shared/components/section-header";
import { HorizontalList } from "@/src/shared/components/horizontal-list";
import { SegmentedControl } from "@/src/shared/components/segmented-control";
import { EmptyState } from "@/src/shared/components/empty-state";
import { colors } from "@/src/shared/theme/theme";

const FILTERS = ["All", "In Progress", "Unplayed"];

export default function PodcastsScreen() {
  const albums = useLibraryStore((s) => s.albums);
  const stats = useLibraryStore((s) => s.stats);
  const setMediaType = useLibraryStore((s) => s.setMediaType);
  const getInProgressAlbums = useLibraryStore((s) => s.getInProgressAlbums);

  const [selectedFilter, setSelectedFilter] = useState(0);
  const [inProgress, setInProgress] = useState<AlbumRow[]>([]);
  const [progressState, setProgressState] = useState(() => new Map<string, "none" | "in_progress" | "finished">());

  useFocusEffect(
    useCallback(() => {
      setMediaType("podcast");
      void getInProgressAlbums("podcast").then(setInProgress);
    }, [setMediaType, getInProgressAlbums]),
  );

  useFocusEffect(
    useCallback(() => {
      if (albums.length === 0) return;
      const ids = albums.map((a) => a.id);
      void getAlbumProgressSummaries(ids).then((summaries) => {
        const states = new Map<string, "none" | "in_progress" | "finished">();
        for (const album of albums) {
          const s = summaries.get(album.id);
          if (!s || s.completed === 0) {
            states.set(album.id, "none");
          } else if (s.fraction >= 1) {
            states.set(album.id, "finished");
          } else {
            states.set(album.id, "in_progress");
          }
        }
        setProgressState(states);
      });
    }, [albums]),
  );

  const filteredAlbums = useMemo(() => {
    if (selectedFilter === 0) return albums;
    if (selectedFilter === 1) {
      return albums.filter((a) => progressState.get(a.id) === "in_progress");
    }
    return albums.filter((a) => progressState.get(a.id) === "none");
  }, [albums, selectedFilter, progressState]);

  const handleShowPress = useCallback(
    (id: string) =>
      router.push({ pathname: "/(tabs)/podcasts/show/[id]", params: { id } }),
    [],
  );

  const renderShowCard = useCallback(
    (item: AlbumRow) => (
      <ShowCard
        id={item.id}
        title={item.title}
        artistName={item.artistName}
        episodeCount={item.trackCount ?? undefined}
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

      {inProgress.length > 0 && (
        <View className="mb-6">
          <SectionHeader title="In Progress" />
          <HorizontalList
            data={inProgress}
            keyExtractor={(item) => item.id}
            renderItem={renderShowCard}
          />
        </View>
      )}

      <View className="px-4 mb-4">
        <SegmentedControl
          segments={FILTERS}
          selectedIndex={selectedFilter}
          onSelect={setSelectedFilter}
        />
      </View>
    </View>
  ), [inProgress, renderShowCard, selectedFilter]);

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
        albums={filteredAlbums}
        onAlbumPress={handleShowPress}
        renderCard={renderShowCard}
        ListHeaderComponent={listHeader}
      />
    </SafeAreaView>
  );
}
