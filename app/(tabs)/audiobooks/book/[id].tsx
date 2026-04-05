import { useCallback, useMemo, memo } from "react";
import { View, FlatList } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { usePlayTracks, useSeekTo } from "@/src/hooks/playback/playback";
import { useProgress } from "@/src/hooks/progress/progress";
import { useAudiobook, useToggleAudiobookFavourite } from "@/src/hooks/audiobooks/audiobooks";
import { useIsPinned, usePinForOffline, useUnpinOffline } from "@/src/hooks/downloads/downloads";
import { ProgressService } from "@/src/services/progress/progress";

import { PressableScale } from "@/src/components/primitives/primitives";
import { ActionButton } from "@/src/components/controls/controls";
import { NavBar } from "@/src/components/navigation/navigation";
import { DetailHeader, MediaRow } from "@/src/components/data-display/data-display";

import { colors } from "@/src/shared/theme/theme";
import { formatDurationLong } from "@/src/shared/lib/format";

type Chapter = { title: string; startMs: number; endMs: number };

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { audiobook } = useAudiobook(id);
  const { mutate: playTracks } = usePlayTracks();
  const { mutate: seekTo } = useSeekTo();
  const { mutate: toggleFavourite } = useToggleAudiobookFavourite();
  const { data: isPinned } = useIsPinned('audiobook', id);
  const { mutate: pin } = usePinForOffline();
  const { mutate: unpin } = useUnpinOffline();

  const chapters = useMemo(() => audiobook?.chapters ?? [], [audiobook]);
  const { data: bookProgress } = useProgress(id);

  const chapterProgress = useMemo(
    () =>
      ProgressService.computeBookChapterProgress(
        chapters,
        bookProgress?.positionMs ?? 0,
        bookProgress?.isCompleted ?? false,
      ),
    [chapters, bookProgress?.positionMs, bookProgress?.isCompleted],
  );

  const isFav = !!audiobook?.isFavourite;

  const handlePlay = useCallback(() => {
    if (!audiobook) return;
    void playTracks({ trackIds: [audiobook.id] });
  }, [audiobook, playTracks]);

  const handleChapterPress = useCallback(
    async (chapterIndex: number) => {
      if (!audiobook || chapterIndex >= chapters.length) return;
      const chapter = chapters[chapterIndex];
      await playTracks({ trackIds: [audiobook.id] });
      await seekTo(chapter.startMs);
    },
    [audiobook, chapters, playTracks, seekTo],
  );

  const handleToggleFavourite = useCallback(() => {
    if (!audiobook) return;
    void Haptics.impactAsync(
      !isFav ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );
    void toggleFavourite(id);
  }, [audiobook, isFav, toggleFavourite, id]);

  const handleTogglePin = useCallback(() => {
    if (!audiobook) return;
    if (isPinned) {
      void unpin({ entityType: 'audiobook', entityId: id });
    } else {
      void pin({ entityType: 'audiobook', entityId: id, sourceId: audiobook.sourceId });
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [audiobook, isPinned, pin, unpin, id]);

  const totalDurationSec = useMemo(
    () => chapters.reduce((sum, c) => sum + (c.endMs - c.startMs), 0) / 1000,
    [chapters],
  );

  if (!audiobook) return null;

  const durationMeta = totalDurationSec > 0 ? ` · ${formatDurationLong(totalDurationSec)}` : "";
  const meta = `${chapters.length} ${chapters.length === 1 ? "chapter" : "chapters"}${durationMeta}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <FlatList
        style={{ flex: 1 }}
        data={chapters}
        keyExtractor={(_item, index) => String(index)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <NavBar />
            <DetailHeader
              artworkUri={audiobook.artworkUri}
              artworkAspect="portrait"
              fallbackIcon="book"
              title={audiobook.title}
              subtitle={audiobook.authorName}
              meta={meta}
              actions={
                <>
                  <ActionButton
                    label="Play"
                    icon="play"
                    variant="primary"
                    onPress={handlePlay}
                  />
                  <PressableScale
                    onPress={handleToggleFavourite}
                    className="items-center justify-center rounded-xl bg-fermata-elevated"
                    style={{ width: 48 }}
                  >
                    <Ionicons
                      name={isFav ? "heart" : "heart-outline"}
                      size={20}
                      color={isFav ? colors.accent : colors.text}
                    />
                  </PressableScale>
                  <PressableScale
                    onPress={handleTogglePin}
                    className="items-center justify-center rounded-xl bg-fermata-elevated"
                    style={{ width: 48 }}
                  >
                    <Ionicons
                      name={isPinned ? "cloud-done" : "cloud-download-outline"}
                      size={20}
                      color={isPinned ? colors.accent : colors.text}
                    />
                  </PressableScale>
                </>
              }
            />
          </View>
        }
        renderItem={({ item, index }) => {
          const cp = chapterProgress.get(index);
          return (
            <BookChapterItem
              item={item}
              index={index}
              isPlaying={false}
              progress={cp?.fraction}
              isCompleted={cp?.isCompleted}
              onPress={handleChapterPress}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

const BookChapterItem = memo(function BookChapterItem({
  item,
  index,
  isPlaying,
  progress,
  isCompleted,
  onPress,
}: {
  item: Chapter;
  index: number;
  isPlaying: boolean;
  progress?: number;
  isCompleted?: boolean;
  onPress: (index: number) => void;
}) {
  const handlePress = useCallback(() => onPress(index), [onPress, index]);
  const duration = (item.endMs - item.startMs) / 1000;

  return (
    <View className="px-4">
      <MediaRow.Chapter
        title={item.title || `Chapter ${index + 1}`}
        duration={duration}
        chapterNumber={index + 1}
        isPlaying={isPlaying}
        isDownloaded={false}
        progress={progress}
        isCompleted={isCompleted}
        onPress={handlePress}
      />
    </View>
  );
});
