import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, FlatList, SectionList, Pressable } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useLibraryStore, type AlbumRow, type ArtistRowType, type TrackRowType, AlbumCard, ArtistRow, TrackRow, useTrackActions, toActionTarget } from "@/src/features/library/library";
import { usePlaybackStore } from "@/src/features/playback/playback";

import { EmptyState } from "@/src/shared/components/empty-state";
import { colors } from "@/src/shared/theme/theme";

interface SearchResults {
  artists: ArtistRowType[];
  albums: AlbumRow[];
  tracks: TrackRowType[];
}

export default function SearchScreen() {
  const search = useLibraryStore((s) => s.search);
  const toggleFavourite = useLibraryStore((s) => s.toggleFavourite);
  const playTrack = usePlaybackStore((s) => s.playTrack);
  const { showTrackActions } = useTrackActions();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const r = await search(query.trim());
      setResults(r);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const hasResults =
    results &&
    (results.artists.length > 0 ||
      results.albums.length > 0 ||
      results.tracks.length > 0);

  return (
    <SafeAreaView className="flex-1 bg-fermata-bg" edges={["top"]}>
      <View className="flex-1 px-4">
        <Text className="text-3xl font-bold text-fermata-text mt-4 mb-4">
          Search
        </Text>

        {/* Search input */}
        <View className="flex-row items-center bg-fermata-surface rounded-xl px-4 mb-4">
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Artists, albums, tracks..."
            placeholderTextColor={colors.muted}
            className="flex-1 text-fermata-text text-base py-3 ml-2"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* Results */}
        {!results ? (
          <EmptyState
            icon="search-outline"
            title="Search your library"
            subtitle="Find artists, albums, and tracks across all your sources"
          />
        ) : !hasResults ? (
          <EmptyState
            icon="musical-notes-outline"
            title="No results"
            subtitle={`Nothing found for "${query}"`}
          />
        ) : (
          <FlatList
            data={[1]} // Single item — we render sections manually
            keyExtractor={() => "results"}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={() => (
              <View>
                {/* Artists */}
                {results.artists.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-sm font-medium text-fermata-text-secondary uppercase tracking-wider mb-2">
                      Artists
                    </Text>
                    {results.artists.map((artist) => (
                      <ArtistRow
                        key={artist.id}
                        name={artist.name}
                        sourceId={artist.sourceId}
                        artworkSourceItemId={artist.artworkSourceItemId}
                        onPress={() =>
                          router.push({
                            pathname: "/(tabs)/library/artist/[name]",
                            params: { name: artist.name },
                          })
                        }
                      />
                    ))}
                  </View>
                )}

                {/* Albums */}
                {results.albums.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-sm font-medium text-fermata-text-secondary uppercase tracking-wider mb-2">
                      Albums
                    </Text>
                    {results.albums.map((album) => (
                      <Pressable
                        key={album.id}
                        onPress={() =>
                          router.push({
                            pathname: "/(tabs)/library/album/[id]",
                            params: { id: album.id },
                          })
                        }
                        className="flex-row items-center py-3"
                      >
                        <View className="w-12 h-12 rounded-lg bg-fermata-surface items-center justify-center">
                          <Ionicons name="disc" size={22} color={colors.muted} />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-fermata-text text-base font-medium" numberOfLines={1}>
                            {album.title}
                          </Text>
                          <Text className="text-fermata-text-secondary text-xs" numberOfLines={1}>
                            {album.artistName}
                            {album.year ? ` · ${album.year}` : ""}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Tracks */}
                {results.tracks.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-sm font-medium text-fermata-text-secondary uppercase tracking-wider mb-2">
                      Tracks
                    </Text>
                    {results.tracks.map((track) => (
                      <TrackRow
                        key={track.id}
                        title={track.title}
                        artistName={track.artistName}
                        duration={track.duration}
                        isFavourite={!!track.isFavourite}
                        onPress={() => playTrack(track.id)}
                        onMorePress={() =>
                          showTrackActions(toActionTarget(track))
                        }
                        onToggleFavourite={() => toggleFavourite(track.id)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
