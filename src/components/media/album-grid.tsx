import type { ReactElement } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View, useWindowDimensions } from "react-native";

import { FlashList } from "@shopify/flash-list";

import type { AlbumRow } from "@/src/services/database/database.schemas";

import { AlphabetScrubber } from "@/src/components/navigation/navigation";
import { useColumns } from "@/src/components/layout/layout";
import { MediaCard } from "@/src/components/data-display/data-display";

import { extractLetters } from "@/src/shared/lib/alphabet";


const GAP = 12;
const PADDING = 16;
const SCRUBBER_WIDTH = 36;

interface AlbumGridProps {
  albums: AlbumRow[];
  onAlbumPress: (id: string) => void;
  /** Custom card renderer. Receives the album and card width. Defaults to MediaCard.Album. */
  renderCard?: (item: AlbumRow, cardWidth: number) => ReactElement;
  /** Override responsive column count. When omitted, columns are responsive. */
  columns?: number;
  /** Card artwork aspect ratio for row height estimation. Defaults to 1 (square). */
  aspectRatio?: number;
  /** Extract the scrubber letter from each album. Defaults to title. */
  scrubberKey?: (item: AlbumRow) => string;
  ListHeaderComponent?: ReactElement;
  style?: StyleProp<ViewStyle>;
}

export function AlbumGrid({
  albums,
  onAlbumPress,
  renderCard,
  columns: columnsProp,
  aspectRatio = 1,
  scrubberKey,
  ListHeaderComponent,
  style,
}: AlbumGridProps) {
  const listRef = useRef<FlashList<AlbumRow>>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const responsiveColumns = useColumns({ base: 2, sm: 3, md: 4, lg: 5, xl: 6 });
  const columns = columnsProp ?? responsiveColumns;

  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - PADDING - SCRUBBER_WIDTH - GAP * (columns - 1)) / columns;
  const rowHeight = cardWidth * aspectRatio + 48;

  const getKey = scrubberKey ?? ((a: AlbumRow) => a.title);
  const { letters, indices } = useMemo(
    () =>
      extractLetters(
        albums.map((a) => ({ key: getKey(a) })),
        (item) => item.key,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [albums, getKey],
  );

  const handleSelect = useCallback(
    (letter: string) => {
      const itemIndex = indices[letter] as number | undefined;
      if (itemIndex == null || !listRef.current) return;
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
          <MediaCard.Album
            id={item.id}
            title={item.title}
            artistName={item.artistName}
            year={item.year}
            artworkUri={item.artworkUri}
            onPress={() => onAlbumPress(item.id)}
          />
        )}
      </View>
    ),
    [onAlbumPress, cardWidth, renderCard],
  );

  const wrappedHeader = ListHeaderComponent ? (
    <View style={{ marginLeft: -PADDING, marginRight: -SCRUBBER_WIDTH }}>
      {ListHeaderComponent}
    </View>
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
