import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { View, FlatList } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useShallow } from "zustand/react/shallow";

import {
  useLibraryStore,
  EpisodeRow,
} from "@/src/features/library/library";
import type { AlbumRow, TrackRowType } from "@/src/features/library/library";
import { usePlaybackStore } from "@/src/features/playback/playback";
import { useDownloadStore, isTrackDownloaded } from "@/src/features/downloads/downloads";
import { getProgressBatch } from "@/src/features/progress/progress";
import type { ProgressEntry } from "@/src/features/progress/progress";
import { resolveArtworkUrl } from "@/src/features/artwork/artwork";

import { NavBar, NavBarAction } from "@/src/shared/components/nav-bar";
import { DetailHeader } from "@/src/shared/components/detail-header";
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
      const sorted = [...tracks].sort((a, b) => {
        if (a.publishedAt && b.publishedAt) {
          return b.publishedAt.localeCompare(a.publishedAt);
        }
        return (b.episodeNumber ?? 0) - (a.episodeNumber ?? 0);
      });
      setEpisodes(sorted);
      const ids = sorted.map((t) => t.id);
      void getProgressBatch(ids).then(setProgressMap);
    });
  }, [id, getAlbum, getTracksByAlbum, isPinned]);

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

  const dlCount = useMemo(
    () => episodes.filter((t) => isTrackDownloaded(t.id)).length,
    [episodes],
  );

  if (!show) return null;

  const artworkUrl = resolveArtworkUrl(
    show.sourceId,
    show.artworkSourceItemId,
    "large",
  );
  const dlMeta = isOfflinePinned
    ? dlCount < episodes.length
      ? ` · ${dlCount}/${episodes.length} downloaded`
      : " · Downloaded"
    : "";
  const meta = `${episodes.length} ${episodes.length === 1 ? "episode" : "episodes"}${dlMeta}`;

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
            <NavBar>
              <NavBarAction
                icon={isOfflinePinned ? "cloud-done" : "cloud-download-outline"}
                color={isOfflinePinned ? colors.accent : colors.muted}
                onPress={async () => {
                  if (isOfflinePinned) {
                    await unpinOffline("album", id);
                    setIsOfflinePinned(false);
                  } else {
                    await pinForOffline("album", id, show.sourceId);
                    setIsOfflinePinned(true);
                  }
                }}
              />
            </NavBar>
            <DetailHeader
              artworkUri={artworkUrl}
              fallbackIcon="mic"
              title={show.title}
              subtitle={show.artistName}
              meta={meta}
            />
          </View>
        }
        renderItem={({ item }) => (
          <ShowEpisodeItem
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

const ShowEpisodeItem = memo(function ShowEpisodeItem({
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

  const dateLabel = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : item.artistName;

  return (
    <View className="px-4">
      <EpisodeRow
        title={item.title}
        dateLabel={dateLabel}
        duration={item.duration}
        episodeNumber={item.episodeNumber ?? item.trackNumber}
        isPlaying={currentTrackId === item.id}
        isDownloaded={isTrackDownloaded(item.id)}
        progress={progressFraction}
        isCompleted={progress?.isCompleted}
        onPress={handlePress}
      />
    </View>
  );
});
