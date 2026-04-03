import { useCallback, useMemo, memo } from "react";
import { View, FlatList } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useShallow } from "zustand/react/shallow";

import { EpisodeRow } from "@/src/features/library/library";
import { usePlaybackStore } from "@/src/features/playback/playback";

import { useShow, useShowEpisodes } from "@/src/hooks/shows/shows";
import type { EpisodeRow as EpisodeRowType } from "@/src/services/database/database.schemas";

import { NavBar } from "@/src/shared/components/nav-bar";
import { DetailHeader } from "@/src/shared/components/detail-header";
import { ActionButton } from "@/src/shared/components/action-button";
import { colors } from "@/src/shared/theme/theme";

export default function PodcastShowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show } = useShow(id);
  const { episodes } = useShowEpisodes(id);
  const { playTracks, currentTrack } = usePlaybackStore(
    useShallow((s) => ({
      playTracks: s.playTracks,
      currentTrack: s.currentTrack,
    })),
  );

  const episodeIds = useMemo(() => episodes.map((e) => e.id), [episodes]);

  const handleEpisodePress = useCallback(
    (episodeId: string) => {
      const idx = episodeIds.indexOf(episodeId);
      if (idx >= 0) {
        void playTracks(episodeIds, idx);
      }
    },
    [episodeIds, playTracks],
  );

  const handlePlayLatest = useCallback(() => {
    if (episodes.length > 0) {
      void playTracks(episodeIds, 0);
    }
  }, [episodes.length, playTracks, episodeIds]);

  if (!show) return null;

  const meta = `${episodes.length} ${episodes.length === 1 ? "episode" : "episodes"}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <FlatList
        style={{ flex: 1 }}
        data={episodes}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <NavBar />
            <DetailHeader
              sourceId={show.sourceId}
              artworkSourceItemId={show.artworkSourceItemId}
              fallbackIcon="mic"
              title={show.title}
              subtitle={show.authorName ?? "Unknown"}
              meta={meta}
              actions={
                episodes.length > 0 ? (
                  <ActionButton label="Play Latest" icon="play" variant="primary" onPress={handlePlayLatest} />
                ) : undefined
              }
            />
          </View>
        }
        renderItem={({ item }) => (
          <ShowEpisodeItem
            item={item}
            currentTrackId={currentTrack?.id}
            onPress={handleEpisodePress}
          />
        )}
      />
    </SafeAreaView>
  );
}

const ShowEpisodeItem = memo(function ShowEpisodeItem({
  item,
  currentTrackId,
  onPress,
}: {
  item: EpisodeRowType;
  currentTrackId: string | undefined;
  onPress: (id: string) => void;
}) {
  const handlePress = useCallback(() => onPress(item.id), [onPress, item.id]);

  const dateLabel = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : undefined;

  return (
    <View className="px-4">
      <EpisodeRow
        title={item.title}
        dateLabel={dateLabel}
        duration={item.duration}
        episodeNumber={item.episodeNumber}
        isPlaying={currentTrackId === item.id}
        isDownloaded={false}
        onPress={handlePress}
      />
    </View>
  );
});
