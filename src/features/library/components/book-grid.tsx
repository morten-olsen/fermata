import type { ReactElement } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View, useWindowDimensions } from "react-native";

import { FlashList } from "@shopify/flash-list";

import { AlphabetScrubber } from "@/src/shared/components/alphabet-scrubber";
import { extractLetters } from "@/src/shared/lib/alphabet";

import type { AlbumRow } from "../library.store";

import { BookCard } from "./book-card";

const COLUMNS = 3;
const GAP = 12;
const PADDING = 16;
const SCRUBBER_WIDTH = 36;

function useCardWidth() {
  const { width } = useWindowDimensions();
  return (width - PADDING - SCRUBBER_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS;
}

interface BookGridProps {
  books: AlbumRow[];
  onBookPress: (id: string) => void;
  /** Optional progress map: bookId → 0–1 progress. */
  progressMap?: Map<string, number>;
  ListHeaderComponent?: ReactElement;
  style?: StyleProp<ViewStyle>;
}

export function BookGrid({
  books,
  onBookPress,
  progressMap,
  ListHeaderComponent,
  style,
}: BookGridProps) {
  const listRef = useRef<FlashList<AlbumRow>>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const cardWidth = useCardWidth();
  // Portrait cards: width * 4/3 aspect + text height
  const rowHeight = cardWidth * (4 / 3) + 48;

  const { letters, indices } = useMemo(
    () =>
      extractLetters(
        books.map((b) => ({ key: b.title })),
        (item) => item.key,
      ),
    [books],
  );

  const handleSelect = useCallback(
    (letter: string) => {
      if (!(letter in indices)) return;
      listRef.current?.scrollToIndex({ index: indices[letter], animated: true });
    },
    [indices],
  );

  const renderItem = useCallback(
    ({ item }: { item: AlbumRow }) => (
      <View style={{ width: cardWidth }}>
        <BookCard
          id={item.id}
          title={item.title}
          artistName={item.artistName}
          sourceId={item.sourceId}
          artworkSourceItemId={item.artworkSourceItemId}
          progress={progressMap?.get(item.id)}
          onPress={() => onBookPress(item.id)}
        />
      </View>
    ),
    [onBookPress, cardWidth, progressMap],
  );

  const wrappedHeader = ListHeaderComponent ? (
    <View>{ListHeaderComponent}</View>
  ) : undefined;

  return (
    <View style={[{ flex: 1 }, style]}>
      <FlashList
        ref={listRef}
        scrollEnabled={scrollEnabled}
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={COLUMNS}
        estimatedItemSize={rowHeight}
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
