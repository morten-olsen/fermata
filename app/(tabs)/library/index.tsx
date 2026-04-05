import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AlbumGrid } from "@/src/components/media/album-grid";
import { ArtistSectionList } from "@/src/components/media/artist-section-list";
import { TrackList } from "@/src/components/media/track-list";
import { PlaylistRow } from "@/src/components/media/playlist-row";
import { useTrackActions, toActionTarget } from "@/src/components/library/track-actions";
import type { TrackRow as TrackRowType , PlaylistRow as PlaylistRowType } from "@/src/services/database/database.schemas";
import { usePlaylists, useCreatePlaylist } from "@/src/hooks/playlists/playlists";
import { useToggleTrackFavourite , useTracks } from "@/src/hooks/tracks/tracks";
import { useArtists } from "@/src/hooks/artists/artists";
import { useAlbums } from "@/src/hooks/albums/albums";
import { useLibraryStats } from "@/src/hooks/library/library";
import { useOfflineMode } from "@/src/hooks/downloads/downloads";
import { usePlayTrack } from "@/src/hooks/playback/playback";

import { colors } from "@/src/shared/theme/theme";
import { SegmentedControl } from "@/src/shared/components/segmented-control";
import { EmptyState } from "@/src/shared/components/empty-state";

const SEGMENTS = ["Albums", "Artists", "Playlists", "Tracks"];

export default function LibraryScreen() {
  const [selectedSegment, setSelectedSegment] = useState(0);

  // Each segment subscribes only to its own data slice — switching segments
  // doesn't cause unrelated data to trigger re-renders.
  const { albums } = useAlbums();
  const { artists } = useArtists();
  const { tracks } = useTracks();
  const { data: playlists = [] } = usePlaylists();
  const stats = useLibraryStats();
  const { mutate: toggleFavourite } = useToggleTrackFavourite();
  const { mutate: createPlaylist } = useCreatePlaylist();

  const { mutate: playTrack } = usePlayTrack();
  const { showTrackActions } = useTrackActions();
  const { offlineMode, setOfflineMode } = useOfflineMode();

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
    const name = `Playlist ${playlists.length + 1}`;
    const id = await createPlaylist(name);
    router.push({
      pathname: "/(tabs)/library/mixtape/[id]",
      params: { id },
    });
  }, [playlists.length, createPlaylist]);

  const handleTrackMorePress = useCallback(
    (item: TrackRowType) => showTrackActions(toActionTarget(item)),
    [showTrackActions]
  );

  const handleTrackToggleFavourite = useCallback(
    async (item: TrackRowType) => {
      await toggleFavourite(item.id);
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
          Music
        </Text>
        <Pressable
          onPress={() => {
            setOfflineMode(!offlineMode);
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
          subtitle="Connect a Jellyfin source in Settings to sync your music"
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
