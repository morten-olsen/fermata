import { useCallback, useMemo, memo } from "react";
import { View, FlatList } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { ChapterRow } from "@/src/components/media/chapter-row";
import { usePlayTracks, useSeekTo } from "@/src/hooks/playback/playback";
import { useAudiobook } from "@/src/hooks/audiobooks/audiobooks";

import { NavBar } from "@/src/shared/components/nav-bar";
import { DetailHeader } from "@/src/shared/components/detail-header";
import { ActionButton } from "@/src/shared/components/action-button";
import { colors } from "@/src/shared/theme/theme";
import { formatDurationLong } from "@/src/shared/lib/format";

type Chapter = { title: string; startMs: number; endMs: number };

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { audiobook } = useAudiobook(id);
  const { mutate: playTracks } = usePlayTracks();
  const { mutate: seekTo } = useSeekTo();

  const chapters = useMemo(() => audiobook?.chapters ?? [], [audiobook]);

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
                <ActionButton
                  label="Play"
                  icon="play"
                  variant="primary"
                  onPress={handlePlay}
                />
              }
            />
          </View>
        }
        renderItem={({ item, index }) => (
          <BookChapterItem
            item={item}
            index={index}
            isPlaying={false}
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
  onPress,
}: {
  item: Chapter;
  index: number;
  isPlaying: boolean;
  onPress: (index: number) => void;
}) {
  const handlePress = useCallback(() => onPress(index), [onPress, index]);
  const duration = (item.endMs - item.startMs) / 1000;

  return (
    <View className="px-4">
      <ChapterRow
        title={item.title}
        duration={duration}
        chapterNumber={index + 1}
        isPlaying={isPlaying}
        isDownloaded={false}
        onPress={handlePress}
      />
    </View>
  );
});
