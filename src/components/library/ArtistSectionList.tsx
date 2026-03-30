import { useCallback, useMemo, useRef, useState, ReactElement } from "react";
import { View, Text, FlatList, StyleProp, ViewStyle } from "react-native";
import { ArtistRow } from "./ArtistRow";
import { AlphabetScrubber } from "@/src/components/common/AlphabetScrubber";
import type { ArtistRow as ArtistRowType } from "@/src/stores/library";

const SECTION_HEADER_HEIGHT = 28;
const ARTIST_ROW_HEIGHT = 72;

// ── Data types ──

type ArtistListItem =
  | { type: "header"; letter: string; key: string }
  | { type: "artist"; artist: ArtistRowType; key: string };

function buildSections(artists: ArtistRowType[]) {
  const items: ArtistListItem[] = [];
  const letterIndices: Record<string, number> = {};
  const groups: Record<string, ArtistRowType[]> = {};

  for (const artist of artists) {
    const firstChar = artist.name.charAt(0).toUpperCase();
    const key = /[A-Z]/.test(firstChar) ? firstChar : "#";
    if (!groups[key]) groups[key] = [];
    groups[key].push(artist);
  }

  const sortedKeys = Object.keys(groups).sort((a, b) =>
    a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)
  );

  for (const letter of sortedKeys) {
    letterIndices[letter] = items.length;
    items.push({ type: "header", letter, key: `header-${letter}` });
    for (const artist of groups[letter]) {
      items.push({ type: "artist", artist, key: artist.id });
    }
  }

  return { items, letterIndices, letters: sortedKeys };
}

function buildOffsets(items: ArtistListItem[], headerOffset: number) {
  const offsets: { length: number; offset: number }[] = [];
  let running = headerOffset;
  for (const item of items) {
    const h =
      item.type === "header" ? SECTION_HEADER_HEIGHT : ARTIST_ROW_HEIGHT;
    offsets.push({ length: h, offset: running });
    running += h;
  }
  return offsets;
}

// ── Component ──

interface ArtistSectionListProps {
  artists: ArtistRowType[];
  onArtistPress: (name: string) => void;
  ListHeaderComponent?: ReactElement;
  /** Height of the ListHeaderComponent — needed for getItemLayout accuracy */
  headerHeight?: number;
  style?: StyleProp<ViewStyle>;
}

export function ArtistSectionList({
  artists,
  onArtistPress,
  ListHeaderComponent,
  headerHeight = 0,
  style,
}: ArtistSectionListProps) {
  const listRef = useRef<FlatList>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const { items, letterIndices, letters } = useMemo(
    () => buildSections(artists),
    [artists]
  );

  const offsets = useMemo(
    () => buildOffsets(items, headerHeight),
    [items, headerHeight]
  );

  const handleSelect = useCallback(
    (letter: string) => {
      const index = letterIndices[letter];
      if (index != null && listRef.current) {
        listRef.current.scrollToOffset({
          offset: offsets[index]?.offset ?? 0,
          animated: true,
        });
      }
    },
    [letterIndices, offsets]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: offsets[index]?.length ?? ARTIST_ROW_HEIGHT,
      offset: offsets[index]?.offset ?? 0,
      index,
    }),
    [offsets]
  );

  const renderItem = useCallback(
    ({ item }: { item: ArtistListItem }) => {
      if (item.type === "header") {
        return (
          <View
            style={{ height: SECTION_HEADER_HEIGHT }}
            className="justify-end px-1 pb-1"
          >
            <Text className="text-xs font-bold text-fermata-muted">
              {item.letter}
            </Text>
          </View>
        );
      }
      return (
        <View style={{ height: ARTIST_ROW_HEIGHT }}>
          <ArtistRow
            name={item.artist.name}
            sourceId={item.artist.sourceId}
            artworkSourceItemId={item.artist.artworkSourceItemId}
            onPress={() => onArtistPress(item.artist.name)}
          />
        </View>
      );
    },
    [onArtistPress]
  );

  return (
    <View style={[{ flex: 1 }, style]}>
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        scrollEnabled={scrollEnabled}
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
          paddingLeft: 16,
          paddingRight: 36,
        }}
        ListHeaderComponent={ListHeaderComponent}
      />
      <AlphabetScrubber
        letters={letters}
        onSelect={handleSelect}
        onScrubStart={() => setScrollEnabled(false)}
        onScrubEnd={() => setScrollEnabled(true)}
      />
    </View>
  );
}
