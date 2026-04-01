import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
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
import { getProgressBatch, computeBookChapterProgress } from "@/src/features/progress/progress";
import type { ProgressEntry } from "@/src/features/progress/progress";
import { resolveArtworkUrl } from "@/src/features/artwork/artwork";

import { NavBar, NavBarAction } from "@/src/shared/components/nav-bar";
import { DetailHeader } from "@/src/shared/components/detail-header";
import { ActionButton } from "@/src/shared/components/action-button";
import { colors } from "@/src/shared/theme/theme";
import { formatDurationLong, formatDownloadMeta } from "@/src/shared/lib/format";

interface AlbumChapter {
  title: string;
  start: number; // seconds
  end: number; // seconds
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAlbum, getTracksByAlbum, toggleAlbumFavourite } = useLibraryStore(
    useShallow((s) => ({
      getAlbum: s.getAlbum,
      getTracksByAlbum: s.getTracksByAlbum,
      toggleAlbumFavourite: s.toggleAlbumFavourite,
    })),
  );
  const { playTracks, seekTo, currentTrack, positionMs } = usePlaybackStore(
    useShallow((s) => ({
      playTracks: s.playTracks,
      seekTo: s.seekTo,
      currentTrack: s.currentTrack,
      positionMs: s.positionMs,
    })),
  );
  const { pinForOffline, unpinOffline, isPinned } = useDownloadStore(
    useShallow((s) => ({
      pinForOffline: s.pinForOffline,
      unpinOffline: s.unpinOffline,
      isPinned: s.isPinned,
    })),
  );

  const listRef = useRef<FlatList<AlbumChapter>>(null);
  const [book, setBook] = useState<AlbumRow>();
  const [chapters, setChapters] = useState<AlbumChapter[]>([]);
  const [audioTrack, setAudioTrack] = useState<TrackRowType>();
  const [trackProgress, setTrackProgress] = useState<ProgressEntry>();
  const [isOfflinePinned, setIsOfflinePinned] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);

  useEffect(() => {
    if (!id) return;
    void getAlbum(id).then((a) => {
      setBook(a);
      setIsFavourite(!!a?.isFavourite);
      // Parse chapters from album JSON
      if (a?.chapters) {
        try {
          const parsed = JSON.parse(a.chapters) as AlbumChapter[];
          setChapters(parsed);
        } catch {
          setChapters([]);
        }
      }
    });
    void isPinned("album", id).then(setIsOfflinePinned);
    void getTracksByAlbum(id).then((tracks) => {
      if (tracks.length === 0) return;
      // Prefer the file track (no chapterStartMs) over legacy chapter tracks
      const fileTrack = tracks.find((t) => t.chapterStartMs == null) ?? tracks[0];
      setAudioTrack(fileTrack);
      void getProgressBatch([fileTrack.id]).then((map) => {
        setTrackProgress(map.get(fileTrack.id));
      });
    });
  }, [id, getAlbum, getTracksByAlbum, isPinned]);

  const handleChapterPress = useCallback(
    (chapterIndex: number) => {
      if (!audioTrack || chapterIndex >= chapters.length) return;
      const chapter = chapters[chapterIndex];

      const isCurrentlyPlaying = currentTrack?.id === audioTrack.id;
      if (isCurrentlyPlaying) {
        // Already playing this track — just seek to chapter start
        void seekTo(chapter.start * 1000);
      } else {
        // Play the audio file track, then seek to chapter start
        void playTracks([audioTrack.id], 0).then(() => {
          if (chapter.start > 0) {
            void seekTo(chapter.start * 1000);
          }
        });
      }
    },
    [audioTrack, chapters, currentTrack, playTracks, seekTo],
  );

  const chapterProgressMap = useMemo(
    () => {
      if (chapters.length === 0 || !trackProgress) return new Map<number, { fraction: number; isCompleted: boolean }>();
      return computeBookChapterProgress(
        chapters,
        trackProgress.positionMs,
        trackProgress.isCompleted,
      );
    },
    [chapters, trackProgress],
  );

  const firstUnfinishedIdx = useMemo(
    () => chapters.findIndex((_c, i) => !chapterProgressMap.get(i)?.isCompleted),
    [chapters, chapterProgressMap],
  );

  const totalProgress = useMemo(
    () => chapters.length > 0
      ? chapters.filter((_c, i) => chapterProgressMap.get(i)?.isCompleted).length / chapters.length
      : 0,
    [chapters, chapterProgressMap],
  );

  const timeRemainingSec = useMemo(() => {
    let remaining = 0;
    for (let i = 0; i < chapters.length; i++) {
      const c = chapters[i];
      const duration = c.end - c.start;
      const cp = chapterProgressMap.get(i);
      if (cp?.isCompleted) continue;
      if (cp && cp.fraction > 0) {
        remaining += duration * (1 - cp.fraction);
      } else {
        remaining += duration;
      }
    }
    return remaining;
  }, [chapters, chapterProgressMap]);

  // Which chapter is currently playing (based on position in the file)
  const activeChapterIdx = useMemo(() => {
    if (!audioTrack || currentTrack?.id !== audioTrack.id) return -1;
    const posSec = positionMs / 1000;
    return chapters.findIndex((c) => posSec >= c.start && posSec < c.end);
  }, [audioTrack, currentTrack, positionMs, chapters]);

  const dlCount = useMemo(
    () => audioTrack && isTrackDownloaded(audioTrack.id) ? 1 : 0,
    [audioTrack],
  );

  useEffect(() => {
    if (chapters.length === 0 || firstUnfinishedIdx <= 2) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: firstUnfinishedIdx, animated: true, viewOffset: 100 });
    }, 300);
    return () => clearTimeout(timer);
  }, [chapters, firstUnfinishedIdx]);

  if (!book) return null;

  const artworkUrl = resolveArtworkUrl(
    book.sourceId,
    book.artworkSourceItemId,
    "large",
  );
  const trackCount = audioTrack ? 1 : 0;
  const dlMeta = formatDownloadMeta(isOfflinePinned, dlCount, trackCount);
  const progressMeta = totalProgress > 0
    ? ` · ${Math.round(totalProgress * 100)}% complete`
    : "";
  const timeMeta = timeRemainingSec > 0 && totalProgress > 0 && totalProgress < 1
    ? ` · ${formatDurationLong(timeRemainingSec)} left`
    : "";
  const totalDuration = chapters.reduce((sum, c) => sum + (c.end - c.start), 0);
  const durationMeta = totalProgress === 0 && totalDuration > 0
    ? ` · ${formatDurationLong(totalDuration)}`
    : "";
  const meta = `${chapters.length} ${chapters.length === 1 ? "chapter" : "chapters"}${progressMeta}${timeMeta}${durationMeta}${dlMeta}`;

  const playLabel = totalProgress > 0 && totalProgress < 1 ? "Continue" : "Play";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={chapters}
        keyExtractor={(_item, index) => String(index)}
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
                    if (audioTrack) {
                      void playTracks([audioTrack.id], 0);
                    }
                  }}
                />
              }
            />
          </View>
        }
        renderItem={({ item, index }) => (
          <BookChapterItem
            item={item}
            index={index}
            isPlaying={index === activeChapterIdx}
            chapterProgress={chapterProgressMap.get(index)}
            onPress={handleChapterPress}
          />
        )}
      />
    </SafeAreaView>
  );
}

const BookChapterItem = memo(function BookChapterItem({
  item,
  index,
  isPlaying,
  chapterProgress,
  onPress,
}: {
  item: AlbumChapter;
  index: number;
  isPlaying: boolean;
  chapterProgress: { fraction: number; isCompleted: boolean } | undefined;
  onPress: (index: number) => void;
}) {
  const handlePress = useCallback(() => onPress(index), [onPress, index]);
  const duration = item.end - item.start;

  return (
    <View className="px-4">
      <ChapterRow
        title={item.title}
        duration={duration}
        chapterNumber={index + 1}
        isPlaying={isPlaying}
        isDownloaded={false}
        progress={chapterProgress?.fraction}
        isCompleted={chapterProgress?.isCompleted}
        onPress={handlePress}
      />
    </View>
  );
});
