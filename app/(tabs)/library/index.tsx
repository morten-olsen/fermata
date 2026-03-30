import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useLibraryStore } from "@/src/stores/library";
import { useSourcesStore } from "@/src/stores/sources";
import { usePlaybackStore } from "@/src/stores/playback";
import { AlbumGrid } from "@/src/components/library/AlbumGrid";
import { ArtistSectionList } from "@/src/components/library/ArtistSectionList";
import { TrackList } from "@/src/components/library/TrackList";
import { PlaylistRow } from "@/src/components/library/PlaylistRow";
import { EmptyState } from "@/src/components/common/EmptyState";
import { SegmentedControl } from "@/src/components/common/SegmentedControl";
import { useTrackActions } from "@/src/components/library/TrackActionSheet";
import { useDownloadStore } from "@/src/stores/downloads";
import { toActionTarget } from "@/src/lib/track-actions";
import { colors } from "@/src/theme";
import type {
  TrackRow as TrackRowType,
  PlaylistRow as PlaylistRowType,
} from "@/src/stores/library";

const SEGMENTS = ["Albums", "Artists", "Playlists", "Tracks"];

export default function LibraryScreen() {
  const {
    albums,
    artists,
    playlists,
    stats,
    refreshAll,
    getTracks,
    createPlaylist,
    toggleFavourite,
  } = useLibraryStore();
  const { playTrack } = usePlaybackStore();
  const { getAllAdapters } = useSourcesStore();
  const { showTrackActions } = useTrackActions();
  const { offlineMode, setOfflineMode } = useDownloadStore();
  const [selectedSegment, setSelectedSegment] = useState(0);
  const [tracks, setTracks] = useState<TrackRowType[]>([]);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (selectedSegment === 3) {
      getTracks(200, 0).then(setTracks);
    }
  }, [selectedSegment]);

  const handleAlbumPress = useCallback(
    (id: string) =>
      router.push({ pathname: "/(tabs)/library/album/[id]", params: { id } }),
    []
  );

  const handleArtistPress = useCallback(
    (name: string) =>
      router.push({
        pathname: "/(tabs)/library/artist/[name]",
        params: { name },
      }),
    []
  );

  const handlePlaylistPress = useCallback(
    (id: string) =>
      router.push({
        pathname: "/(tabs)/library/mixtape/[id]",
        params: { id },
      }),
    []
  );

  const handleCreatePlaylist = useCallback(async () => {
    const adapter = getAllAdapters()[0];
    const name = `Playlist ${playlists.length + 1}`;
    const id = await createPlaylist(name, adapter);
    router.push({
      pathname: "/(tabs)/library/mixtape/[id]",
      params: { id },
    });
  }, [playlists.length, createPlaylist, getAllAdapters]);

  const handleTrackMorePress = useCallback(
    (item: TrackRowType) => showTrackActions(toActionTarget(item)),
    [showTrackActions]
  );

  const handleTrackToggleFavourite = useCallback(
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

  const renderPlaylistItem = useCallback(
    ({ item }: { item: PlaylistRowType }) => (
      <PlaylistRow
        name={item.name}
        trackCount={item.trackCount}
        isFavourite={!!item.isMixTape}
        sourceId={item.sourceId}
        onPress={() => handlePlaylistPress(item.id)}
      />
    ),
    [handlePlaylistPress]
  );

  // Prepend a "create" placeholder to the playlists data so the header stays the same height
  const playlistListData = useMemo(
    () => [{ id: "__create__" } as PlaylistRowType, ...playlists],
    [playlists]
  );

  const hasLibrary = stats.albums > 0 || stats.artists > 0;

  const listHeader = (
    <View>
      <View style={{ paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
          Library
        </Text>
        <Pressable
          onPress={() => {
            setOfflineMode(!offlineMode);
            // Refresh library with new filter
            refreshAll();
          }}
          style={{ padding: 8 }}
        >
          <Ionicons
            name={offlineMode ? "cloud-offline" : "cloud-offline-outline"}
            size={22}
            color={offlineMode ? colors.accent : colors.muted}
          />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <SegmentedControl
          segments={SEGMENTS}
          selectedIndex={selectedSegment}
          onSelect={setSelectedSegment}
        />
      </View>
    </View>
  );

  if (!hasLibrary) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0B" }} edges={["top"]}>
        {listHeader}
        <EmptyState
          icon="library-outline"
          title="Your library is empty"
          subtitle="Connect a source in Settings to start syncing your music"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0B" }} edges={["top"]}>
      {selectedSegment === 0 ? (
        <AlbumGrid
          key="albums"
          style={{ flex: 1 }}
          albums={albums}
          onAlbumPress={handleAlbumPress}
          ListHeaderComponent={listHeader}
        />
      ) : selectedSegment === 1 ? (
        <ArtistSectionList
          key="artists"
          style={{ flex: 1 }}
          artists={artists}
          onArtistPress={handleArtistPress}
          ListHeaderComponent={listHeader}
        />
      ) : selectedSegment === 2 ? (
        <FlatList
          key="playlists"
          style={{ flex: 1 }}
          data={playlistListData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            item.id === "__create__" ? (
              <Pressable
                onPress={handleCreatePlaylist}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: colors.border,
                  }}
                >
                  <Ionicons name="add" size={22} color={colors.accent} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    fontSize: 16,
                    fontWeight: "500",
                    color: colors.accent,
                  }}
                >
                  New Playlist
                </Text>
              </Pressable>
            ) : (
              renderPlaylistItem({ item } as { item: PlaylistRowType })
            )
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingLeft: 16, paddingRight: 36 }}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon="list"
              title="No playlists yet"
              subtitle="Create one or sync from your sources"
            />
          }
        />
      ) : (
        <TrackList
          key="tracks"
          style={{ flex: 1 }}
          tracks={tracks}
          onTrackPress={playTrack}
          onTrackMorePress={handleTrackMorePress}
          onToggleFavourite={handleTrackToggleFavourite}
          ListHeaderComponent={listHeader}
        />
      )}
    </SafeAreaView>
  );
}
