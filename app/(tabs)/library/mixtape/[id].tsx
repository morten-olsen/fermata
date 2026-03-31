import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useShallow } from "zustand/react/shallow";

import {
  useLibraryStore,
  TrackRow,
  useTrackActions,
  toActionTarget,
} from "@/src/features/library/library";
import type { PlaylistDetail, PlaylistTrackRow } from "@/src/features/library/library";
import { usePlaybackStore } from "@/src/features/playback/playback";

import { PressableScale } from "@/src/shared/components/pressable-scale";
import { colors } from "@/src/shared/theme/theme";

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { playTracks, currentTrack } = usePlaybackStore(
    useShallow((s) => ({ playTracks: s.playTracks, currentTrack: s.currentTrack })),
  );
  const { getPlaylist, getPlaylistTracks, toggleFavourite, deletePlaylist } = useLibraryStore(
    useShallow((s) => ({
      getPlaylist: s.getPlaylist,
      getPlaylistTracks: s.getPlaylistTracks,
      toggleFavourite: s.toggleFavourite,
      deletePlaylist: s.deletePlaylist,
    })),
  );
  const { showTrackActions } = useTrackActions();
  const [playlist, setPlaylist] = useState<PlaylistDetail>();
  const [tracks, setTracks] = useState<PlaylistTrackRow[]>([]);

  useEffect(() => {
    if (!id) return;
    getPlaylist(id).then((result) => result && setPlaylist(result));
    getPlaylistTracks(id).then(setTracks);
  }, [id]);

  const trackIds = useMemo(() => tracks.map((t) => t.track.id), [tracks]);

  const handleDelete = useCallback(() => {
    if (!id || !playlist) return;
    Alert.alert(
      `Delete "${playlist.name}"?`,
      "This will remove the playlist and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePlaylist(id);
            router.back();
          },
        },
      ]
    );
  }, [id, playlist, deletePlaylist]);

  if (!playlist) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <FlatList
        style={{ flex: 1 }}
        data={tracks}
        keyExtractor={(item) => item.track.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            {/* Navigation */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Pressable onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={26} color={colors.text} />
              </Pressable>
              <Pressable onPress={handleDelete} style={{ padding: 8 }}>
                <Ionicons name="trash-outline" size={22} color={colors.muted} />
              </Pressable>
            </View>

            {/* Playlist header */}
            <View className="px-4 mb-4">
              <View
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: 12,
                  backgroundColor: colors.elevated,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons name="list" size={40} color={colors.muted} />
              </View>
              <Text className="text-2xl font-bold text-fermata-text">
                {playlist.name}
              </Text>
              <Text className="text-sm text-fermata-text-secondary mt-1">
                {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
                {playlist.sourceId ? "" : " · Local"}
              </Text>
            </View>

            {/* Play / Shuffle */}
            {tracks.length > 0 && (
              <View className="flex-row px-4 mb-4 gap-3">
                <PressableScale
                  onPress={() => playTracks(tracks.map((t) => t.track.id))}
                  className="flex-1 flex-row items-center justify-center bg-fermata-text py-3 rounded-xl"
                >
                  <Ionicons name="play" size={18} color={colors.bg} />
                  <Text className="text-fermata-bg font-semibold text-base ml-2">
                    Play
                  </Text>
                </PressableScale>
                <PressableScale
                  onPress={() => {
                    const shuffled = [...tracks];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    playTracks(shuffled.map((t) => t.track.id));
                  }}
                  className="flex-1 flex-row items-center justify-center bg-fermata-elevated py-3 rounded-xl"
                >
                  <Ionicons name="shuffle" size={18} color={colors.text} />
                  <Text className="text-fermata-text font-semibold text-base ml-2">
                    Shuffle
                  </Text>
                </PressableScale>
              </View>
            )}

            <View className="h-px bg-fermata-border mx-4 mb-2" />
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Ionicons name="musical-notes-outline" size={48} color={colors.border} />
            <Text style={{ color: colors.muted, fontSize: 14, marginTop: 12 }}>
              This playlist is empty
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <MixtapeTrackItem
            item={item}
            currentTrackId={currentTrack?.id}
            trackIds={trackIds}
            playTracks={playTracks}
            showTrackActions={showTrackActions}
            toggleFavourite={toggleFavourite}
          />
        )}
      />
    </SafeAreaView>
  );
}

const MixtapeTrackItem = memo(function MixtapeTrackItem({
  item,
  currentTrackId,
  trackIds,
  playTracks,
  showTrackActions,
  toggleFavourite,
}: {
  item: PlaylistTrackRow;
  currentTrackId: string | undefined;
  trackIds: string[];
  playTracks: (ids: string[], startIndex?: number) => Promise<void>;
  showTrackActions: (target: ReturnType<typeof toActionTarget>) => void;
  toggleFavourite: (id: string) => Promise<boolean>;
}) {
  const handlePress = useCallback(
    () => playTracks(trackIds, item.position),
    [playTracks, trackIds, item.position],
  );
  const handleMore = useCallback(
    () => showTrackActions(toActionTarget(item.track)),
    [showTrackActions, item.track],
  );
  const handleFav = useCallback(
    () => toggleFavourite(item.track.id),
    [toggleFavourite, item.track.id],
  );

  return (
    <View className="px-4">
      <TrackRow
        title={item.track.title}
        artistName={item.track.artistName}
        duration={item.track.duration}
        trackNumber={item.position + 1}
        isPlaying={currentTrackId === item.track.id}
        isFavourite={!!item.track.isFavourite}
        onPress={handlePress}
        onMorePress={handleMore}
        onToggleFavourite={handleFav}
      />
    </View>
  );
});
