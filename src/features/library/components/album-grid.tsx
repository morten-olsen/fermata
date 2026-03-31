import type { ReactElement } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { StyleProp, ViewStyle} from "react-native";
import { View, Dimensions } from "react-native";

import { FlashList } from "@shopify/flash-list";

import { AlphabetScrubber } from "@/src/shared/components/alphabet-scrubber";
import { extractLetters } from "@/src/shared/lib/alphabet";

import type { AlbumRow } from "../library.store";

import { AlbumCard } from "./album-card";

const SCREEN_WIDTH = Dimensions.get("window").width;
const COLUMNS = 2;
const GAP = 12;
const PADDING = 16;
const SCRUBBER_WIDTH = 36;
const CARD_WIDTH =
  (SCREEN_WIDTH - PADDING - SCRUBBER_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS;

// Approximate row height: card is square + text below + margin
const ROW_HEIGHT = CARD_WIDTH + 48;

interface AlbumGridProps {
  albums: AlbumRow[];
  onAlbumPress: (id: string) => void;
  ListHeaderComponent?: ReactElement;
  style?: StyleProp<ViewStyle>;
}

export function AlbumGrid({
  albums,
  onAlbumPress,
  ListHeaderComponent,
  style,
}: AlbumGridProps) {
  const listRef = useRef<FlashList<AlbumRow>>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const { letters, indices } = useMemo(
    () =>
      extractLetters(
        albums.map((a) => ({ key: a.title })),
        (item) => item.key,
      ),
    [albums],
  );

  const handleSelect = useCallback(
    (letter: string) => {
      const itemIndex = indices[letter];
      if (itemIndex == null || !listRef.current) return;
      // FlashList scrollToIndex uses flat item indices even with numColumns
      listRef.current.scrollToIndex({
        index: itemIndex,
        animated: true,
      });
    },
    [indices],
  );

  const renderItem = useCallback(
    ({ item }: { item: AlbumRow }) => (
      <View style={{ width: CARD_WIDTH }}>
        <AlbumCard
          id={item.id}
          title={item.title}
          artistName={item.artistName}
          year={item.year}
          sourceId={item.sourceId}
          artworkSourceItemId={item.artworkSourceItemId}
          onPress={() => onAlbumPress(item.id)}
        />
      </View>
    ),
    [onAlbumPress],
  );

  const wrappedHeader = ListHeaderComponent ? (
    <View>{ListHeaderComponent}</View>
  ) : undefined;

  return (
    <View style={[{ flex: 1 }, style]}>
      <FlashList
        ref={listRef}
        scrollEnabled={scrollEnabled}
        data={albums}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={COLUMNS}
        estimatedItemSize={ROW_HEIGHT}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
          paddingLeft: PADDING,
          paddingRight: SCRUBBER_WIDTH,
        }}
        ListHeaderComponent={wrappedHeader}
      />
      {letters.length > 1 && (
        <AlphabetScrubber
          letters={letters}
          onSelect={handleSelect}
          onScrubStart={() => setScrollEnabled(false)}
          onScrubEnd={() => setScrollEnabled(true)}
        />
      )}
    </View>
  );
}

export { CARD_WIDTH as ALBUM_CARD_WIDTH };
