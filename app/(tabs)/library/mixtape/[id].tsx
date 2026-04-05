import { useCallback, useMemo, memo } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { PlaylistTrackRow } from "@/src/services/playlists/playlists";
import { usePlayTracks, useCurrentTrack } from "@/src/hooks/playback/playback";
import { useToggleTrackFavourite } from "@/src/hooks/tracks/tracks";
import { usePlaylist, usePlaylistTracks, useDeletePlaylist } from "@/src/hooks/playlists/playlists";

import { useTrackActions, toActionTarget } from "@/src/components/library/track-actions";
import { MediaRow } from "@/src/components/data-display/data-display";
import { PressableScale } from "@/src/components/primitives/primitives";

import { colors } from "@/src/shared/theme/theme";

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutate: playTracks } = usePlayTracks();
  const { mutate: toggleFavourite } = useToggleTrackFavourite();
  const { mutate: deletePlaylist } = useDeletePlaylist();
  const { showTrackActions } = useTrackActions();
  const { data: playlist } = usePlaylist(id);
  const { data: tracks = [] } = usePlaylistTracks(id);

  const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);

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
          onPress: () => {
            void deletePlaylist(id).then(() => router.back());
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
        keyExtractor={(item) => item.id}
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
                  onPress={() => playTracks({ trackIds: tracks.map((t) => t.id) })}
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
                    void playTracks({ trackIds: shuffled.map((t) => t.id) });
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
  trackIds,
  playTracks,
  showTrackActions,
  toggleFavourite,
}: {
  item: PlaylistTrackRow;
  trackIds: string[];
  playTracks: (params: { trackIds: string[]; startIndex?: number }) => Promise<void>;
  showTrackActions: (target: ReturnType<typeof toActionTarget>) => void;
  toggleFavourite: (id: string) => Promise<boolean>;
}) {
  const { data: currentTrack } = useCurrentTrack();
  const handlePress = useCallback(
    () => playTracks({ trackIds, startIndex: item.position }),
    [playTracks, trackIds, item.position],
  );
  const handleMore = useCallback(
    () => showTrackActions(toActionTarget(item)),
    [showTrackActions, item],
  );
  const handleFav = useCallback(
    () => toggleFavourite(item.id),
    [toggleFavourite, item.id],
  );

  return (
    <View className="px-4">
      <MediaRow.Track
        title={item.title}
        artistName={item.artistName}
        duration={item.duration}
        trackNumber={item.position + 1}
        isPlaying={currentTrack?.id === item.id}
        isFavourite={!!item.isFavourite}
        onPress={handlePress}
        onMorePress={handleMore}
        onToggleFavourite={handleFav}
      />
    </View>
  );
});
