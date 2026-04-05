import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { AlbumRow, TrackRow as TrackRowType, PlaylistRow as PlaylistRowType } from "@/src/services/database/database.schemas";
import { usePlaylists, useCreatePlaylist } from "@/src/hooks/playlists/playlists";
import { useToggleTrackFavourite, useTracks } from "@/src/hooks/tracks/tracks";
import { useArtists } from "@/src/hooks/artists/artists";
import { useAlbums, useFavouriteAlbums, useRecentlyAddedAlbums } from "@/src/hooks/albums/albums";
import { useLibraryStats } from "@/src/hooks/library/library";
import { useOfflineMode } from "@/src/hooks/downloads/downloads";
import { usePlayTrack } from "@/src/hooks/playback/playback";

import { useTrackActions, toActionTarget } from "@/src/components/library/track-actions";
import { MediaCard } from "@/src/components/data-display/data-display";
import { TrackList } from "@/src/components/media/track-list";
import { ArtistSectionList } from "@/src/components/media/artist-section-list";
import { AlbumGrid } from "@/src/components/media/album-grid";
import { SegmentedControl } from "@/src/components/controls/controls";
import { EmptyState } from "@/src/components/feedback/feedback";
import { SectionHeader, HorizontalList } from "@/src/components/layout/layout";

import { colors } from "@/src/shared/theme/theme";

const SEGMENTS = ["Albums", "Artists", "Tracks"];

export default function LibraryScreen() {
  const [selectedSegment, setSelectedSegment] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const gridCardWidth = Math.floor((screenWidth - 16 - 36 - 12 * 2) / 3);

  const { albums } = useAlbums();
  const { artists } = useArtists();
  const { tracks } = useTracks();
  const { data: playlists = [] } = usePlaylists();
  const { albums: favouriteAlbums } = useFavouriteAlbums();
  const { albums: recentlyAdded } = useRecentlyAddedAlbums(20);
  const { stats } = useLibraryStats();
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
    const name = `Mix Tape ${playlists.length + 1}`;
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

  // ── Horizontal section renderers ────────────────────────

  const renderMixTapeCard = useCallback(
    (item: PlaylistRowType) => (
      <MediaCard.Album
        title={item.name}
        artistName={`${item.trackCount} ${item.trackCount === 1 ? "track" : "tracks"}`}
        onPress={() => handlePlaylistPress(item.id)}
      />
    ),
    [handlePlaylistPress]
  );

  const renderAlbumCard = useCallback(
    (item: AlbumRow) => (
      <MediaCard.Album
        title={item.title}
        artistName={item.artistName}
        year={item.year}
        artworkUri={item.artworkUri}
        onPress={() => handleAlbumPress(item.id)}
      />
    ),
    [handleAlbumPress]
  );

  // ── Mix tape data with create card prepended ────────────

  const mixTapeCreateSentinel = useMemo(
    () => ({ id: "__create__", name: "", trackCount: 0 }) as PlaylistRowType,
    []
  );

  const mixTapeData = useMemo(
    () => [...playlists, mixTapeCreateSentinel],
    [playlists, mixTapeCreateSentinel]
  );

  const renderMixTapeOrCreate = useCallback(
    (item: PlaylistRowType) => {
      if (item.id === "__create__") {
        return (
          <Pressable
            onPress={handleCreatePlaylist}
            className="aspect-square rounded-xl bg-fermata-surface border border-dashed border-fermata-border items-center justify-center"
          >
            <Ionicons name="add" size={28} color={colors.accent} />
            <Text className="text-xs font-medium text-fermata-accent mt-1">
              New
            </Text>
          </Pressable>
        );
      }
      return renderMixTapeCard(item);
    },
    [handleCreatePlaylist, renderMixTapeCard]
  );

  const hasLibrary = stats.albums > 0 || stats.artists > 0;

  // ── List header with horizontal sections ────────────────

  const listHeader = (
    <View>
      <View className="px-4 flex-row items-center justify-between">
        <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
          Music
        </Text>
        <Pressable
          onPress={() => setOfflineMode(!offlineMode)}
          className="p-2"
        >
          <Ionicons
            name={offlineMode ? "cloud-offline" : "cloud-offline-outline"}
            size={22}
            color={offlineMode ? colors.accent : colors.muted}
          />
        </Pressable>
      </View>

      {mixTapeData.length > 1 && (
        <View className="mb-4">
          <SectionHeader title="Mix Tapes" />
          <HorizontalList
            data={mixTapeData}
            keyExtractor={(item) => item.id}
            renderItem={renderMixTapeOrCreate}
            itemWidth={gridCardWidth}
          />
        </View>
      )}

      {favouriteAlbums.length > 0 && (
        <View className="mb-4">
          <SectionHeader title="Favourites" />
          <HorizontalList
            data={favouriteAlbums}
            keyExtractor={(item) => item.id}
            renderItem={renderAlbumCard}
            itemWidth={gridCardWidth}
          />
        </View>
      )}

      {recentlyAdded.length > 0 && (
        <View className="mb-4">
          <SectionHeader title="Recently Added" />
          <HorizontalList
            data={recentlyAdded}
            keyExtractor={(item) => item.id}
            renderItem={renderAlbumCard}
            itemWidth={gridCardWidth}
          />
        </View>
      )}

      <View className="px-4 mb-4">
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
      <SafeAreaView className="flex-1 bg-fermata-bg" edges={["top"]}>
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
    <SafeAreaView className="flex-1 bg-fermata-bg" edges={["top"]}>
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
