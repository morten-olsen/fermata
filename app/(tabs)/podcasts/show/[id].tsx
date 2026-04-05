import { useCallback, useMemo, memo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { EpisodeRow } from "@/src/components/media/episode-row";
import { usePlayTracks } from "@/src/hooks/playback/playback";
import { useShow, useShowEpisodes, useToggleShowFavourite } from "@/src/hooks/shows/shows";
import type { EnrichedEpisode } from "@/src/hooks/shows/shows";
import { useIsPinned, usePinForOffline, useUnpinOffline, useIsDownloaded } from "@/src/hooks/downloads/downloads";
import { DownloadService } from "@/src/services/downloads/downloads";
import { useService } from "@/src/hooks/service/service";

import { BottomSheet } from "@/src/shared/components/bottom-sheet";
import { NavBar } from "@/src/shared/components/nav-bar";
import { DetailHeader } from "@/src/shared/components/detail-header";
import { ActionButton } from "@/src/shared/components/action-button";
import { PressableScale } from "@/src/shared/components/pressable-scale";
import { colors } from "@/src/shared/theme/theme";

export default function PodcastShowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show } = useShow(id);
  const { episodes } = useShowEpisodes(id);
  const { mutate: playTracks } = usePlayTracks();
  const { mutate: toggleFavourite } = useToggleShowFavourite();
  const { data: isPinned } = useIsPinned('show', id);
  const { mutate: pin } = usePinForOffline();
  const { mutate: unpin } = useUnpinOffline();
  const [isFav, setIsFav] = useState<boolean | null>(null);
  const [actionEpisode, setActionEpisode] = useState<EnrichedEpisode | null>(null);

  const episodeIds = useMemo(() => episodes.map((e) => e.id), [episodes]);

  // Use local optimistic state, fall back to DB value
  const showIsFav = isFav ?? !!show?.isFavourite;

  const handleEpisodePress = useCallback(
    (episodeId: string) => {
      void playTracks({ trackIds: [episodeId] });
    },
    [playTracks],
  );

  const handlePlayLatest = useCallback(() => {
    if (episodeIds.length > 0) {
      void playTracks({ trackIds: [episodeIds[0]] });
    }
  }, [playTracks, episodeIds]);

  const handleToggleFavourite = useCallback(() => {
    const newVal = !showIsFav;
    setIsFav(newVal);
    void Haptics.impactAsync(
      newVal ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );
    void toggleFavourite(id);
  }, [showIsFav, toggleFavourite, id]);

  const handleTogglePin = useCallback(() => {
    if (!show) return;
    if (isPinned) {
      void unpin({ entityType: 'show', entityId: id });
    } else {
      void pin({ entityType: 'show', entityId: id, sourceId: show.sourceId });
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [show, isPinned, pin, unpin, id]);

  const handleEpisodeMore = useCallback(
    (episode: EnrichedEpisode) => setActionEpisode(episode),
    [],
  );

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
              artworkUri={show.artworkUri}
              fallbackIcon="mic"
              title={show.title}
              subtitle={show.authorName ?? "Unknown"}
              meta={meta}
              actions={
                episodes.length > 0 ? (
                  <>
                    <ActionButton label="Play Latest" icon="play" variant="primary" onPress={handlePlayLatest} />
                    <PressableScale
                      onPress={handleToggleFavourite}
                      className="items-center justify-center rounded-xl bg-fermata-elevated"
                      style={{ width: 48 }}
                    >
                      <Ionicons
                        name={showIsFav ? "heart" : "heart-outline"}
                        size={20}
                        color={showIsFav ? colors.accent : colors.text}
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
                ) : undefined
              }
            />
          </View>
        }
        renderItem={({ item }) => (
          <ShowEpisodeItem
            item={item}
            onPress={handleEpisodePress}
            onMorePress={handleEpisodeMore}
          />
        )}
      />

      {actionEpisode && (
        <EpisodeActionSheet
          episode={actionEpisode}
          sourceId={show.sourceId}
          onDismiss={() => setActionEpisode(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Episode list item ────────────────────────────────

const ShowEpisodeItem = memo(function ShowEpisodeItem({
  item,
  onPress,
  onMorePress,
}: {
  item: EnrichedEpisode;
  onPress: (id: string) => void;
  onMorePress: (episode: EnrichedEpisode) => void;
}) {
  const handlePress = useCallback(() => onPress(item.id), [onPress, item.id]);
  const handleMore = useCallback(() => onMorePress(item), [onMorePress, item]);

  const dateLabel = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <View className="px-4">
      <EpisodeRow
        title={item.title}
        dateLabel={dateLabel}
        duration={item.duration}
        episodeNumber={item.episodeNumber}
        isPlaying={item.isPlaying}
        isDownloaded={item.isDownloaded}
        progress={item.progress ?? undefined}
        isCompleted={item.isCompleted}
        onPress={handlePress}
        onMorePress={handleMore}
      />
    </View>
  );
});

// ── Episode action sheet ─────────────────────────────

function EpisodeActionSheet({
  episode,
  sourceId,
  onDismiss,
}: {
  episode: EnrichedEpisode;
  sourceId: string;
  onDismiss: () => void;
}) {
  const downloadService = useService(DownloadService);
  const isDownloaded = useIsDownloaded(episode.id, 'episode');

  const handleToggleDownload = useCallback(() => {
    if (isDownloaded) {
      void downloadService.removeDownload(episode.id, 'episode');
    } else {
      void downloadService.enqueueItem({
        id: episode.id,
        type: 'episode',
        sourceId,
        sourceItemId: episode.sourceItemId,
        contentUrl: episode.contentUrl,
      });
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  }, [isDownloaded, downloadService, episode, sourceId, onDismiss]);

  return (
    <BottomSheet visible onDismiss={onDismiss}>
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "500" }} numberOfLines={2}>
            {episode.title}
          </Text>
        </View>

        <Pressable onPress={handleToggleDownload}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 4 }}>
            <Ionicons
              name={isDownloaded ? "cloud-done" : "cloud-download-outline"}
              size={20}
              color={isDownloaded ? colors.accent : colors.text}
            />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: colors.text, marginLeft: 14 }}>
              {isDownloaded ? "Downloaded" : "Download Episode"}
            </Text>
          </View>
        </Pressable>

        <View style={{ height: 8 }} />
      </View>
    </BottomSheet>
  );
}
