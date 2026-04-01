import { useEffect, useState, useCallback, useMemo, memo } from "react";
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

import { PressableScale } from "@/src/shared/components/pressable-scale";
import { colors } from "@/src/shared/theme/theme";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAlbum, getTracksByAlbum, toggleAlbumFavourite } = useLibraryStore(
    useShallow((s) => ({
      getAlbum: s.getAlbum,
      getTracksByAlbum: s.getTracksByAlbum,
      toggleAlbumFavourite: s.toggleAlbumFavourite,
    })),
  );
  const { playAlbum, playTracks, currentTrack } = usePlaybackStore(
    useShallow((s) => ({
      playAlbum: s.playAlbum,
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

  const [book, setBook] = useState<AlbumRow>();
  const [chapters, setChapters] = useState<TrackRowType[]>([]);
  const [progressMap, setProgressMap] = useState(new Map<string, ProgressEntry>());
  const [isOfflinePinned, setIsOfflinePinned] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);

  useEffect(() => {
    if (!id) return;
    void getAlbum(id).then((a) => {
      setBook(a);
      setIsFavourite(!!a?.isFavourite);
    });
    void isPinned("album", id).then(setIsOfflinePinned);
    void getTracksByAlbum(id).then((tracks) => {
      setChapters(tracks);
      const ids = tracks.map((t) => t.id);
      void getProgressBatch(ids).then(setProgressMap);
    });
  }, [id, getAlbum, getTracksByAlbum, isPinned]);

  const handleChapterPress = useCallback(
    (chapterId: string) => {
      const idx = chapters.findIndex((c) => c.id === chapterId);
      if (idx >= 0) {
        void playTracks(
          chapters.map((c) => c.id),
          idx,
        );
      }
    },
    [chapters, playTracks],
  );

  // Compute per-chapter progress from individual chapter progress entries.
  // If no per-chapter entries exist but there's a book-level entry (from ABS sync),
  // derive chapter states from cumulative durations vs the book position.
  const chapterProgressMap = useMemo(() => {
    const map = new Map<string, { fraction: number; isCompleted: boolean }>();
    if (chapters.length === 0) return map;

    // Check if we have any per-chapter progress (from local playback tracking)
    let hasPerChapterProgress = false;
    for (const c of chapters) {
      const p = progressMap.get(c.id);
      if (p && (p.positionMs > 0 || p.isCompleted)) {
        hasPerChapterProgress = true;
        break;
      }
    }

    if (hasPerChapterProgress) {
      // Use per-chapter progress directly
      for (const c of chapters) {
        const p = progressMap.get(c.id);
        if (p) {
          const dMs = p.durationMs > 0 ? p.durationMs : c.duration * 1000;
          map.set(c.id, {
            fraction: dMs > 0 ? p.positionMs / dMs : 0,
            isCompleted: p.isCompleted,
          });
        }
      }
      return map;
    }

    // Fallback: check if the first chapter has book-level progress from ABS sync
    // (adapter maps book progress to all chapters with the same positionMs/durationMs)
    const bookProgress = progressMap.get(chapters[0].id);
    if (!bookProgress || bookProgress.durationMs === 0) return map;

    const bookPositionSec = bookProgress.positionMs / 1000;
    let cumulativeSec = 0;

    for (const c of chapters) {
      const chapterStart = cumulativeSec;
      const chapterEnd = cumulativeSec + c.duration;

      if (bookProgress.isCompleted || bookPositionSec >= chapterEnd) {
        map.set(c.id, { fraction: 1, isCompleted: true });
      } else if (bookPositionSec > chapterStart) {
        const chapterPos = bookPositionSec - chapterStart;
        map.set(c.id, { fraction: chapterPos / c.duration, isCompleted: false });
      }

      cumulativeSec = chapterEnd;
    }

    return map;
  }, [chapters, progressMap]);

  const firstUnfinished = useMemo(
    () => chapters.find((c) => !chapterProgressMap.get(c.id)?.isCompleted),
    [chapters, chapterProgressMap],
  );

  const totalProgress = useMemo(
    () => chapters.length > 0
      ? chapters.filter((c) => chapterProgressMap.get(c.id)?.isCompleted).length / chapters.length
      : 0,
    [chapters, chapterProgressMap],
  );

  if (!book) return null;

  const artworkUrl = resolveArtworkUrl(
    book.sourceId,
    book.artworkSourceItemId,
    "large",
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <FlatList
        style={{ flex: 1 }}
        data={chapters}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
              <Pressable onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={26} color={colors.text} />
              </Pressable>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Pressable
                  onPress={async () => {
                    const newVal = await toggleAlbumFavourite(id);
                    setIsFavourite(newVal);
                  }}
                  style={{ padding: 8 }}
                >
                  <Ionicons
                    name={isFavourite ? "heart" : "heart-outline"}
                    size={22}
                    color={isFavourite ? colors.accent : colors.muted}
                  />
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (isOfflinePinned) {
                      await unpinOffline("album", id);
                      setIsOfflinePinned(false);
                    } else {
                      await pinForOffline("album", id, book.sourceId);
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
            </View>

            <View className="items-center px-8 mb-6">
              <View className="w-48 h-64 rounded-2xl bg-fermata-surface overflow-hidden shadow-lg">
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
                    <Ionicons name="book" size={48} color={colors.muted} />
                  </View>
                )}
              </View>
            </View>

            <View className="px-4 mb-2">
              <Text className="text-2xl font-bold text-fermata-text">
                {book.title}
              </Text>
              <Text className="text-base text-fermata-text-secondary mt-1">
                {book.artistName}
              </Text>
              <Text className="text-sm text-fermata-muted mt-1">
                {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
                {totalProgress > 0 && ` · ${Math.round(totalProgress * 100)}% complete`}
                {isOfflinePinned && (() => {
                  const dlCount = chapters.filter(t => isTrackDownloaded(t.id)).length;
                  return dlCount < chapters.length
                    ? ` · ${dlCount}/${chapters.length} downloaded`
                    : " · Downloaded";
                })()}
              </Text>
            </View>

            <View className="flex-row px-4 mt-4 mb-4 gap-3">
              <PressableScale
                onPress={() => {
                  if (firstUnfinished) {
                    handleChapterPress(firstUnfinished.id);
                  } else if (id) {
                    void playAlbum(id);
                  }
                }}
                className="flex-1 flex-row items-center justify-center bg-fermata-text py-3 rounded-xl"
              >
                <Ionicons name="play" size={18} color={colors.bg} />
                <Text className="text-fermata-bg font-semibold text-base ml-2">
                  {totalProgress > 0 && totalProgress < 1 ? "Continue" : "Play"}
                </Text>
              </PressableScale>
            </View>

            <View className="h-px bg-fermata-border mx-4 mb-2" />
          </View>
        }
        renderItem={({ item }) => (
          <ChapterItem
            item={item}
            currentTrackId={currentTrack?.id}
            chapterProgress={chapterProgressMap.get(item.id)}
            onPress={handleChapterPress}
          />
        )}
      />
    </SafeAreaView>
  );
}

const ChapterItem = memo(function ChapterItem({
  item,
  currentTrackId,
  chapterProgress,
  onPress,
}: {
  item: TrackRowType;
  currentTrackId: string | undefined;
  chapterProgress: { fraction: number; isCompleted: boolean } | undefined;
  onPress: (id: string) => void;
}) {
  const handlePress = useCallback(() => onPress(item.id), [onPress, item.id]);

  return (
    <View className="px-4">
      <TrackRow
        title={item.title}
        artistName={item.artistName}
        duration={item.duration}
        trackNumber={item.trackNumber}
        isPlaying={currentTrackId === item.id}
        isDownloaded={isTrackDownloaded(item.id)}
        progress={chapterProgress?.fraction}
        isCompleted={chapterProgress?.isCompleted}
        onPress={handlePress}
      />
    </View>
  );
});
