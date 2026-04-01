import { useEffect, useState, useCallback, memo } from "react";
import { View, Text, FlatList, Pressable } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useShallow } from "zustand/react/shallow";

import {
  useLibraryStore,
  TrackRow,
} from "@/src/features/library/library";
import type { AlbumRow, TrackRowType } from "@/src/features/library/library";
import { usePlaybackStore } from "@/src/features/playback/playback";
import { useDownloadStore, isTrackDownloaded } from "@/src/features/downloads/downloads";
import { getProgressBatch } from "@/src/features/progress/progress";
import type { ProgressEntry } from "@/src/features/progress/progress";
import { resolveArtworkUrl } from "@/src/features/artwork/artwork";

import { colors } from "@/src/shared/theme/theme";

export default function PodcastShowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAlbum, getTracksByAlbum } = useLibraryStore(
    useShallow((s) => ({
      getAlbum: s.getAlbum,
      getTracksByAlbum: s.getTracksByAlbum,
    })),
  );
  const { playTracks, currentTrack } = usePlaybackStore(
    useShallow((s) => ({
      playTracks: s.playTracks,
      currentTrack: s.currentTrack,
    })),
  );
  const { pinForOffline, unpinOffline, isPinned } = useDownloadStore(
    useShallow((s) => ({
      pinForOffline: s.pinForOffline,
      unpinOffline: s.unpinOffline,
      isPinned: s.isPinned,
    })),
  );

  const [show, setShow] = useState<AlbumRow>();
  const [episodes, setEpisodes] = useState<TrackRowType[]>([]);
  const [progressMap, setProgressMap] = useState(new Map<string, ProgressEntry>());
  const [isOfflinePinned, setIsOfflinePinned] = useState(false);

  useEffect(() => {
    if (!id) return;
    void getAlbum(id).then(setShow);
    void isPinned("album", id).then(setIsOfflinePinned);
    void getTracksByAlbum(id).then((tracks) => {
      // Sort episodes by published date (newest first) or episode number
      const sorted = [...tracks].sort((a, b) => {
        if (a.publishedAt && b.publishedAt) {
          return b.publishedAt.localeCompare(a.publishedAt);
        }
        return (b.episodeNumber ?? 0) - (a.episodeNumber ?? 0);
      });
      setEpisodes(sorted);

      // Load progress for all episodes
      const ids = sorted.map((t) => t.id);
      void getProgressBatch(ids).then(setProgressMap);
    });
  }, [id, getAlbum, getTracksByAlbum, isPinned]);

  const handleEpisodePress = useCallback(
    (episodeId: string) => {
      const idx = episodes.findIndex((e) => e.id === episodeId);
      if (idx >= 0) {
        void playTracks(
          episodes.map((e) => e.id),
          idx,
        );
      }
    },
    [episodes, playTracks],
  );

  if (!show) return null;

  const artworkUrl = resolveArtworkUrl(
    show.sourceId,
    show.artworkSourceItemId,
    "large",
  );

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
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
              <Pressable onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={26} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (isOfflinePinned) {
                    await unpinOffline("album", id);
                    setIsOfflinePinned(false);
                  } else {
                    await pinForOffline("album", id, show.sourceId);
                    setIsOfflinePinned(true);
                  }
                }}
                style={{ padding: 8 }}
              >
                <Ionicons
                  name={isOfflinePinned ? "cloud-done" : "cloud-download-outline"}
                  size={22}
                  color={isOfflinePinned ? colors.accent : colors.muted}
                />
              </Pressable>
            </View>

            <View className="items-center px-8 mb-6">
              <View className="w-48 h-48 rounded-2xl bg-fermata-surface overflow-hidden shadow-lg">
                {artworkUrl ? (
                  <Image
                    source={{ uri: artworkUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    cachePolicy="disk"
                    transition={300}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="mic" size={48} color={colors.muted} />
                  </View>
                )}
              </View>
            </View>

            <View className="px-4 mb-4">
              <Text className="text-2xl font-bold text-fermata-text">
                {show.title}
              </Text>
              <Text className="text-base text-fermata-text-secondary mt-1">
                {show.artistName}
              </Text>
              <Text className="text-sm text-fermata-muted mt-1">
                {episodes.length} {episodes.length === 1 ? "episode" : "episodes"}
                {isOfflinePinned && (() => {
                  const dlCount = episodes.filter(t => isTrackDownloaded(t.id)).length;
                  return dlCount < episodes.length
                    ? ` · ${dlCount}/${episodes.length} downloaded`
                    : " · Downloaded";
                })()}
              </Text>
            </View>

            <View className="h-px bg-fermata-border mx-4 mb-2" />
          </View>
        }
        renderItem={({ item }) => (
          <EpisodeItem
            item={item}
            currentTrackId={currentTrack?.id}
            progress={progressMap.get(item.id)}
            onPress={handleEpisodePress}
          />
        )}
      />
    </SafeAreaView>
  );
}

const EpisodeItem = memo(function EpisodeItem({
  item,
  currentTrackId,
  progress,
  onPress,
}: {
  item: TrackRowType;
  currentTrackId: string | undefined;
  progress: ProgressEntry | undefined;
  onPress: (id: string) => void;
}) {
  const handlePress = useCallback(() => onPress(item.id), [onPress, item.id]);

  const progressFraction =
    progress && progress.durationMs > 0
      ? progress.positionMs / progress.durationMs
      : undefined;

  return (
    <View className="px-4">
      <TrackRow
        title={item.title}
        artistName={item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : item.artistName}
        duration={item.duration}
        trackNumber={item.episodeNumber ?? item.trackNumber}
        isPlaying={currentTrackId === item.id}
        isDownloaded={isTrackDownloaded(item.id)}
        progress={progressFraction}
        isCompleted={progress?.isCompleted}
        onPress={handlePress}
      />
    </View>
  );
});
