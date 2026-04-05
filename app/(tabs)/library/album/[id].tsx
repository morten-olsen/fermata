import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import { View, FlatList } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";

import { useToggleTrackFavourite } from "@/src/hooks/tracks/tracks";
import { useToggleAlbumFavourite , useAlbum, useAlbumTracks } from "@/src/hooks/albums/albums";
import type { EnrichedTrack } from "@/src/hooks/albums/albums";
import { useIsPinned, usePinForOffline, useUnpinOffline } from "@/src/hooks/downloads/downloads";
import { usePlayAlbum, useShuffleAlbum } from "@/src/hooks/playback/playback";

import { useTrackActions, toActionTarget } from "@/src/components/library/track-actions";
import { ActionButton } from "@/src/components/controls/controls";
import { NavBar, NavBarAction } from "@/src/components/navigation/navigation";
import { DetailHeader, MediaRow } from "@/src/components/data-display/data-display";

import { colors } from "@/src/shared/theme/theme";
import { formatDurationLong, formatDownloadMeta } from "@/src/shared/lib/format";

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { album } = useAlbum(id);
  const { tracks } = useAlbumTracks(id);
  const { mutate: toggleFavourite } = useToggleTrackFavourite();
  const { mutate: toggleAlbumFavourite } = useToggleAlbumFavourite();
  const { mutate: playAlbum } = usePlayAlbum();
  const { mutate: shuffleAlbum } = useShuffleAlbum();
  const { showTrackActions } = useTrackActions();
  const { mutate: pinForOffline } = usePinForOffline();
  const { mutate: unpinOffline } = useUnpinOffline();
  const { data: isOfflinePinned = false } = useIsPinned("album", id);
  const listRef = useRef<FlatList<EnrichedTrack>>(null);
  const [isFavourite, setIsFavourite] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsFavourite(!!album?.isFavourite);
  }, [id, album]);

  const handleToggleFavourite = useCallback(
    (item: EnrichedTrack) => {
      void toggleFavourite(item.id);
    },
    [toggleFavourite]
  );

  const trackToAction = useCallback(
    (item: EnrichedTrack) =>
      toActionTarget({ ...item, artworkUri: item.artworkUri ?? album?.artworkUri }),
    [album]
  );

  const dlCount = useMemo(
    () => tracks.filter((t) => t.isDownloaded).length,
    [tracks],
  );

  const totalDurationSec = useMemo(
    () => tracks.reduce((sum, t) => sum + t.duration, 0),
    [tracks],
  );

  const playingTrackId = useMemo(() => tracks.find((t) => t.isPlaying)?.id, [tracks]);
  useEffect(() => {
    if (!playingTrackId || tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === playingTrackId);
    if (idx <= 2) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewOffset: 100 });
    }, 300);
    return () => clearTimeout(timer);
  }, [playingTrackId, tracks]);

  if (!album) return null;

  const dlMeta = formatDownloadMeta(isOfflinePinned, dlCount, tracks.length);
  const durationMeta = totalDurationSec > 0 ? ` · ${formatDurationLong(totalDurationSec)}` : "";
  const meta = `${album.year ? `${album.year} · ` : ""}${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}${durationMeta}${dlMeta}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={tracks}
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
                  if (!id) return;
                  const newVal = await toggleAlbumFavourite(id);
                  setIsFavourite(newVal);
                }}
              />
              <NavBarAction
                icon={isOfflinePinned ? "cloud-done" : "cloud-download-outline"}
                color={isOfflinePinned ? colors.accent : colors.muted}
                onPress={async () => {
                  if (isOfflinePinned) {
                    await unpinOffline({ entityType: "album", entityId: id });
                  } else {
                    await pinForOffline({ entityType: "album", entityId: id, sourceId: album.sourceId });
                  }
                }}
              />
            </NavBar>
            <DetailHeader
              artworkUri={album.artworkUri}
              title={album.title}
              subtitle={album.artistName}
              onSubtitlePress={() =>
                router.push({
                  pathname: "/(tabs)/library/artist/[name]",
                  params: { name: album.artistName },
                })
              }
              meta={meta}
              actions={
                <>
                  <ActionButton
                    label="Play"
                    icon="play"
                    variant="primary"
                    onPress={() => id && playAlbum({ albumId: id })}
                  />
                  <ActionButton
                    label="Shuffle"
                    icon="shuffle"
                    variant="secondary"
                    onPress={() => id && shuffleAlbum(id)}
                  />
                </>
              }
            />
          </View>
        }
        renderItem={({ item, index }) => (
          <AlbumTrackItem
            item={item}
            index={index}
            albumId={id}
            playAlbum={playAlbum}
            showTrackActions={showTrackActions}
            trackToAction={trackToAction}
            handleToggleFavourite={handleToggleFavourite}
          />
        )}
      />
    </SafeAreaView>
  );
}

const AlbumTrackItem = memo(function AlbumTrackItem({
  item,
  index,
  albumId,
  playAlbum,
  showTrackActions,
  trackToAction,
  handleToggleFavourite,
}: {
  item: EnrichedTrack;
  index: number;
  albumId: string;
  playAlbum: (params: { albumId: string; startIndex?: number }) => Promise<void>;
  showTrackActions: (target: ReturnType<typeof toActionTarget>) => void;
  trackToAction: (item: EnrichedTrack) => ReturnType<typeof toActionTarget>;
  handleToggleFavourite: (item: EnrichedTrack) => void;
}) {
  const handlePress = useCallback(() => playAlbum({ albumId, startIndex: index }), [playAlbum, albumId, index]);
  const handleMore = useCallback(() => showTrackActions(trackToAction(item)), [showTrackActions, trackToAction, item]);
  const handleFav = useCallback(() => handleToggleFavourite(item), [handleToggleFavourite, item]);

  return (
    <View className="px-4">
      <MediaRow.Track
        title={item.title}
        artistName={item.artistName}
        duration={item.duration}
        trackNumber={item.trackNumber}
        isPlaying={item.isPlaying}
        isFavourite={!!item.isFavourite}
        isDownloaded={item.isDownloaded}
        isQueued={item.isQueued}
        onPress={handlePress}
        onMorePress={handleMore}
        onToggleFavourite={handleFav}
      />
    </View>
  );
});
