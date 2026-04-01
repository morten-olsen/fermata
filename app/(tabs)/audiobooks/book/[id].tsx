import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { View, FlatList } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useShallow } from "zustand/react/shallow";

import {
  useLibraryStore,
  ChapterRow,
} from "@/src/features/library/library";
import type { AlbumRow, TrackRowType } from "@/src/features/library/library";
import { usePlaybackStore } from "@/src/features/playback/playback";
import { useDownloadStore, isTrackDownloaded } from "@/src/features/downloads/downloads";
import { getProgressBatch } from "@/src/features/progress/progress";
import type { ProgressEntry } from "@/src/features/progress/progress";
import { resolveArtworkUrl } from "@/src/features/artwork/artwork";

import { NavBar, NavBarAction } from "@/src/shared/components/nav-bar";
import { DetailHeader } from "@/src/shared/components/detail-header";
import { ActionButton } from "@/src/shared/components/action-button";
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

  const chapterIds = useMemo(() => chapters.map((c) => c.id), [chapters]);

  const handleChapterPress = useCallback(
    (chapterId: string) => {
      const idx = chapterIds.indexOf(chapterId);
      if (idx >= 0) {
        void playTracks(chapterIds, idx);
      }
    },
    [chapterIds, playTracks],
  );

  const chapterProgressMap = useMemo(() => {
    const map = new Map<string, { fraction: number; isCompleted: boolean }>();
    if (chapters.length === 0) return map;

    let hasPerChapterProgress = false;
    for (const c of chapters) {
      const p = progressMap.get(c.id);
      if (p && (p.positionMs > 0 || p.isCompleted)) {
        hasPerChapterProgress = true;
        break;
      }
    }

    if (hasPerChapterProgress) {
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

  const dlCount = useMemo(
    () => chapters.filter((t) => isTrackDownloaded(t.id)).length,
    [chapters],
  );

  if (!book) return null;

  const artworkUrl = resolveArtworkUrl(
    book.sourceId,
    book.artworkSourceItemId,
    "large",
  );
  const dlMeta = isOfflinePinned
    ? dlCount < chapters.length
      ? ` · ${dlCount}/${chapters.length} downloaded`
      : " · Downloaded"
    : "";
  const progressMeta = totalProgress > 0
    ? ` · ${Math.round(totalProgress * 100)}% complete`
    : "";
  const meta = `${chapters.length} ${chapters.length === 1 ? "chapter" : "chapters"}${progressMeta}${dlMeta}`;

  const playLabel = totalProgress > 0 && totalProgress < 1 ? "Continue" : "Play";

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
            <NavBar>
              <NavBarAction
                icon={isFavourite ? "heart" : "heart-outline"}
                color={isFavourite ? colors.accent : colors.muted}
                onPress={async () => {
                  const newVal = await toggleAlbumFavourite(id);
                  setIsFavourite(newVal);
                }}
              />
              <NavBarAction
                icon={isOfflinePinned ? "cloud-done" : "cloud-download-outline"}
                color={isOfflinePinned ? colors.accent : colors.muted}
                onPress={async () => {
                  if (isOfflinePinned) {
                    await unpinOffline("album", id);
                    setIsOfflinePinned(false);
                  } else {
                    await pinForOffline("album", id, book.sourceId);
                    setIsOfflinePinned(true);
                  }
                }}
              />
            </NavBar>
            <DetailHeader
              artworkUri={artworkUrl}
              artworkAspect="portrait"
              fallbackIcon="book"
              title={book.title}
              subtitle={book.artistName}
              meta={meta}
              actions={
                <ActionButton
                  label={playLabel}
                  icon="play"
                  variant="primary"
                  onPress={() => {
                    if (firstUnfinished) {
                      handleChapterPress(firstUnfinished.id);
                    } else if (id) {
                      void playAlbum(id);
                    }
                  }}
                />
              }
            />
          </View>
        }
        renderItem={({ item }) => (
          <BookChapterItem
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

const BookChapterItem = memo(function BookChapterItem({
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
      <ChapterRow
        title={item.title}
        artistName={item.artistName}
        duration={item.duration}
        chapterNumber={item.trackNumber}
        isPlaying={currentTrackId === item.id}
        isDownloaded={isTrackDownloaded(item.id)}
        progress={chapterProgress?.fraction}
        isCompleted={chapterProgress?.isCompleted}
        onPress={handlePress}
      />
    </View>
  );
});
