import { useEffect, useState, useCallback, useMemo, memo } from "react";
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
import type { AlbumRow, TrackRowType } from "@/src/features/library/library";
import { usePlaybackStore } from "@/src/features/playback/playback";
import { useDownloadStore, isTrackDownloaded, isTrackQueued } from "@/src/features/downloads/downloads";
import { resolveArtworkUrl } from "@/src/features/artwork/artwork";

import { NavBar, NavBarAction } from "@/src/shared/components/nav-bar";
import { DetailHeader } from "@/src/shared/components/detail-header";
import { ActionButton } from "@/src/shared/components/action-button";
import { colors } from "@/src/shared/theme/theme";

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAlbum, getTracksByAlbum, toggleFavourite, toggleAlbumFavourite } = useLibraryStore(
    useShallow((s) => ({
      getAlbum: s.getAlbum,
      getTracksByAlbum: s.getTracksByAlbum,
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
  const { pinForOffline, unpinOffline, isPinned } = useDownloadStore(
    useShallow((s) => ({
      pinForOffline: s.pinForOffline,
      unpinOffline: s.unpinOffline,
      isPinned: s.isPinned,
    })),
  );
  const [isOfflinePinned, setIsOfflinePinned] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);

  const [album, setAlbum] = useState<AlbumRow>();
  const [tracks, setTracks] = useState<TrackRowType[]>([]);

  useEffect(() => {
    if (!id) return;
    void getAlbum(id).then((a) => {
      setAlbum(a);
      setIsFavourite(!!a?.isFavourite);
    });
    void getTracksByAlbum(id).then(setTracks);
    void isPinned("album", id).then(setIsOfflinePinned);
  }, [id, getAlbum, getTracksByAlbum, isPinned]);

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

  const dlCount = useMemo(
    () => tracks.filter((t) => isTrackDownloaded(t.id)).length,
    [tracks],
  );

  if (!album) return null;

  const artworkUrl = resolveArtworkUrl(
    album.sourceId,
    album.artworkSourceItemId,
    "large"
  );
  const dlMeta = isOfflinePinned
    ? dlCount < tracks.length
      ? ` · ${dlCount}/${tracks.length} downloaded`
      : " · Downloaded"
    : "";
  const meta = `${album.year ? `${album.year} · ` : ""}${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}${dlMeta}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <FlatList
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
                    await unpinOffline("album", id);
                    setIsOfflinePinned(false);
                  } else {
                    await pinForOffline("album", id, album.sourceId);
                    setIsOfflinePinned(true);
                  }
                }}
              />
            </NavBar>
            <DetailHeader
              artworkUri={artworkUrl}
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
        isDownloaded={isTrackDownloaded(item.id)}
        isQueued={isTrackQueued(item.id)}
        onPress={handlePress}
        onMorePress={handleMore}
        onToggleFavourite={handleFav}
      />
    </View>
  );
});
