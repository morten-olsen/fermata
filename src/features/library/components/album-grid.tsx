import type { ReactElement } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { StyleProp, ViewStyle} from "react-native";
import { View, useWindowDimensions } from "react-native";

import { FlashList } from "@shopify/flash-list";

import { AlphabetScrubber } from "@/src/shared/components/alphabet-scrubber";
import { extractLetters } from "@/src/shared/lib/alphabet";

import type { AlbumRow } from "../library.store";

import { AlbumCard } from "./album-card";

const DEFAULT_COLUMNS = 2;
const GAP = 12;
const PADDING = 16;
const SCRUBBER_WIDTH = 36;

function useCardWidth(columns: number): number {
  const { width } = useWindowDimensions();
  return (width - PADDING - SCRUBBER_WIDTH - GAP * (columns - 1)) / columns;
}

interface AlbumGridProps {
  albums: AlbumRow[];
  onAlbumPress: (id: string) => void;
  /** Custom card renderer. Receives the album and card width. Defaults to AlbumCard. */
  renderCard?: (item: AlbumRow, cardWidth: number) => ReactElement;
  /** Number of columns. Defaults to 2. */
  columns?: number;
  /** Card artwork aspect ratio for row height estimation. Defaults to 1 (square). */
  aspectRatio?: number;
  ListHeaderComponent?: ReactElement;
  style?: StyleProp<ViewStyle>;
}

export function AlbumGrid({
  albums,
  onAlbumPress,
  renderCard,
  columns = DEFAULT_COLUMNS,
  aspectRatio = 1,
  ListHeaderComponent,
  style,
}: AlbumGridProps) {
  const listRef = useRef<FlashList<AlbumRow>>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const cardWidth = useCardWidth(columns);
  const rowHeight = cardWidth * aspectRatio + 48;

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
      <View style={{ width: cardWidth }}>
        {renderCard ? (
          renderCard(item, cardWidth)
        ) : (
          <AlbumCard
            id={item.id}
            title={item.title}
            artistName={item.artistName}
            year={item.year}
            sourceId={item.sourceId}
            artworkSourceItemId={item.artworkSourceItemId}
            onPress={() => onAlbumPress(item.id)}
          />
        )}
      </View>
    ),
    [onAlbumPress, cardWidth, renderCard],
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
        numColumns={columns}
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
