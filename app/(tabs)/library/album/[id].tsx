import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import { View, FlatList } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useShallow } from "zustand/react/shallow";

import {
  useLibraryStore,
  TrackRow,
  useTrackActions,
  toActionTarget,
} from "@/src/features/library/library";
import type { TrackRowType } from "@/src/features/library/library";
import { usePlaybackStore } from "@/src/features/playback/playback";

import { useAlbum, useAlbumTracks } from "@/src/hooks/albums/albums";
import { useIsPinned, usePinForOffline, useUnpinOffline } from "@/src/hooks/downloads/downloads";
import { useService } from "@/src/hooks/service/service";
import { DownloadService } from "@/src/services/downloads/downloads";

import { NavBar, NavBarAction } from "@/src/shared/components/nav-bar";
import { DetailHeader } from "@/src/shared/components/detail-header";
import { ActionButton } from "@/src/shared/components/action-button";
import { colors } from "@/src/shared/theme/theme";
import { formatDurationLong, formatDownloadMeta } from "@/src/shared/lib/format";

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { album } = useAlbum(id);
  const { tracks } = useAlbumTracks(id);
  const { toggleFavourite, toggleAlbumFavourite } = useLibraryStore(
    useShallow((s) => ({
      toggleFavourite: s.toggleFavourite,
      toggleAlbumFavourite: s.toggleAlbumFavourite,
    })),
  );
  const { playAlbum, shuffleAlbum, currentTrack } = usePlaybackStore(
    useShallow((s) => ({
      playAlbum: s.playAlbum,
      shuffleAlbum: s.shuffleAlbum,
      currentTrack: s.currentTrack,
    })),
  );
  const { showTrackActions } = useTrackActions();
  const { mutate: pinForOffline } = usePinForOffline();
  const { mutate: unpinOffline } = useUnpinOffline();
  const { data: isOfflinePinned = false } = useIsPinned("album", id);
  const listRef = useRef<FlatList<TrackRowType>>(null);
  const [isFavourite, setIsFavourite] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsFavourite(!!album?.isFavourite);
  }, [id, album]);

  const handleToggleFavourite = useCallback(
    async (item: TrackRowType) => {
      const newVal = await toggleFavourite(item.id);
      setTracks((prev) =>
        prev.map((t) =>
          t.id === item.id ? { ...t, isFavourite: newVal ? 1 : 0 } : t
        )
      );
    },
    [toggleFavourite]
  );

  const trackToAction = useCallback(
    (item: TrackRowType) =>
      toActionTarget(item, album?.artworkSourceItemId),
    [album]
  );

  const downloadService = useService(DownloadService);
  const dlCount = useMemo(
    () => tracks.filter((t) => downloadService.isDownloaded(t.id, 'track')).length,
    [tracks, downloadService],
  );

  const totalDurationSec = useMemo(
    () => tracks.reduce((sum, t) => sum + t.duration, 0),
    [tracks],
  );

  const currentTrackId = currentTrack?.id;
  useEffect(() => {
    if (!currentTrackId || tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === currentTrackId);
    if (idx <= 2) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewOffset: 100 });
    }, 300);
    return () => clearTimeout(timer);
  }, [currentTrackId, tracks]);

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
              sourceId={album.sourceId}
              artworkSourceItemId={album.artworkSourceItemId}
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
                    onPress={() => id && playAlbum(id)}
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
            currentTrackId={currentTrack?.id}
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
  currentTrackId,
  playAlbum,
  showTrackActions,
  trackToAction,
  handleToggleFavourite,
}: {
  item: TrackRowType;
  index: number;
  albumId: string;
  currentTrackId: string | undefined;
  playAlbum: (albumId: string, startIndex?: number) => Promise<void>;
  showTrackActions: (target: ReturnType<typeof toActionTarget>) => void;
  trackToAction: (item: TrackRowType) => ReturnType<typeof toActionTarget>;
  handleToggleFavourite: (item: TrackRowType) => void;
}) {
  const downloadService = useService(DownloadService);
  const handlePress = useCallback(() => playAlbum(albumId, index), [playAlbum, albumId, index]);
  const handleMore = useCallback(() => showTrackActions(trackToAction(item)), [showTrackActions, trackToAction, item]);
  const handleFav = useCallback(() => handleToggleFavourite(item), [handleToggleFavourite, item]);

  return (
    <View className="px-4">
      <TrackRow
        title={item.title}
        artistName={item.artistName}
        duration={item.duration}
        trackNumber={item.trackNumber}
        isPlaying={currentTrackId === item.id}
        isFavourite={!!item.isFavourite}
        isDownloaded={downloadService.isDownloaded(item.id, 'track')}
        isQueued={downloadService.isQueued(item.id, 'track')}
        onPress={handlePress}
        onMorePress={handleMore}
        onToggleFavourite={handleFav}
      />
    </View>
  );
});
