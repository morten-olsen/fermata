import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useLibraryStore, type AlbumRow, type TrackRow as TrackRowType } from "@/src/stores/library";
import { usePlaybackStore } from "@/src/stores/playback";
import { useDownloadStore } from "@/src/stores/downloads";
import { isTrackDownloaded, isTrackQueued } from "@/src/services/download-manager";
import { useTrackActions } from "@/src/components/library/TrackActionSheet";
import { toActionTarget } from "@/src/lib/track-actions";
import { resolveArtworkUrl } from "@/src/lib/artwork";
import { TrackRow } from "@/src/components/library/TrackRow";
import { colors } from "@/src/theme";

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAlbum, getTracksByAlbum, toggleFavourite } = useLibraryStore();
  const { playAlbum, shuffleAlbum, currentTrack } = usePlaybackStore();
  const { showTrackActions } = useTrackActions();
  const { pinForOffline, unpinOffline, isPinned } = useDownloadStore();
  const [isOfflinePinned, setIsOfflinePinned] = useState(false);

  const [album, setAlbum] = useState<AlbumRow>();
  const [tracks, setTracks] = useState<TrackRowType[]>([]);

  useEffect(() => {
    if (!id) return;
    getAlbum(id).then(setAlbum);
    getTracksByAlbum(id).then(setTracks);
    isPinned("album", id).then(setIsOfflinePinned);
  }, [id]);

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

  if (!album) return null;

  const artworkUrl = resolveArtworkUrl(
    album.sourceId,
    album.artworkSourceItemId,
    "large"
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0B" }} edges={["top"]}>
      <FlatList
        style={{ flex: 1 }}
        data={tracks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
              <Pressable onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={26} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!id || !album) return;
                  if (isOfflinePinned) {
                    await unpinOffline("album", id);
                    setIsOfflinePinned(false);
                  } else {
                    await pinForOffline("album", id, album.sourceId);
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

            <View className="items-center px-8 mb-6">
              <View className="w-64 h-64 rounded-2xl bg-fermata-surface overflow-hidden shadow-lg">
                {artworkUrl ? (
                  <Image
                    source={{ uri: artworkUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={300}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="disc" size={64} color={colors.muted} />
                  </View>
                )}
              </View>
            </View>

            <View className="px-4 mb-2">
              <Text className="text-2xl font-bold text-fermata-text">
                {album.title}
              </Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/library/artist/[name]",
                    params: { name: album.artistName },
                  })
                }
              >
                <Text className="text-base text-fermata-accent mt-1">
                  {album.artistName}
                </Text>
              </Pressable>
              <Text className="text-sm text-fermata-text-secondary mt-1">
                {album.year ? `${album.year} · ` : ""}
                {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
                {isOfflinePinned && (() => {
                  const dlCount = tracks.filter(t => isTrackDownloaded(t.id)).length;
                  return dlCount < tracks.length
                    ? ` · ${dlCount}/${tracks.length} downloaded`
                    : " · Downloaded";
                })()}
              </Text>
            </View>

            <View className="flex-row px-4 mt-4 mb-4 gap-3">
              <Pressable
                onPress={() => id && playAlbum(id)}
                className="flex-1 flex-row items-center justify-center bg-fermata-text py-3 rounded-xl"
              >
                <Ionicons name="play" size={18} color={colors.bg} />
                <Text className="text-fermata-bg font-semibold text-base ml-2">
                  Play
                </Text>
              </Pressable>
              <Pressable
                onPress={() => id && shuffleAlbum(id)}
                className="flex-1 flex-row items-center justify-center bg-fermata-elevated py-3 rounded-xl"
              >
                <Ionicons name="shuffle" size={18} color={colors.text} />
                <Text className="text-fermata-text font-semibold text-base ml-2">
                  Shuffle
                </Text>
              </Pressable>
            </View>

            <View className="h-px bg-fermata-border mx-4 mb-2" />
          </View>
        }
        renderItem={({ item, index }) => (
          <View className="px-4">
            <TrackRow
              title={item.title}
              artistName={item.artistName}
              duration={item.duration}
              trackNumber={item.trackNumber}
              isPlaying={currentTrack?.id === item.id}
              isFavourite={!!item.isFavourite}
              isDownloaded={isTrackDownloaded(item.id)}
              isQueued={isTrackQueued(item.id)}
              onPress={() => id && playAlbum(id, index)}
              onMorePress={() => showTrackActions(trackToAction(item))}
              onToggleFavourite={() => handleToggleFavourite(item)}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
