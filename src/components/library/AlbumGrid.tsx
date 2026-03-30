import { useCallback, useMemo, useRef, useState, ReactElement } from "react";
import { View, FlatList, Dimensions, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { AnimatedAlbumCard } from "./AnimatedAlbumCard";
import { AlphabetScrubber } from "@/src/components/common/AlphabetScrubber";
import { extractLetters } from "@/src/lib/alphabet";
import type { AlbumRow } from "@/src/stores/library";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLUMNS = 2;
const GAP = 12;
const PADDING = 16;
const SCRUBBER_WIDTH = 36;
const CARD_WIDTH =
  (SCREEN_WIDTH - PADDING - SCRUBBER_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS;

// Approximate row height: card is square + text below + margin
const ROW_HEIGHT = CARD_WIDTH + 48;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<AlbumRow>);

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
  const listRef = useRef<FlatList>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

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
      const rowIndex = Math.floor(itemIndex / COLUMNS);
      listRef.current.scrollToOffset({
        offset: rowIndex * ROW_HEIGHT,
        animated: true,
      });
    },
    [indices],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: AlbumRow; index: number }) => (
      <AnimatedAlbumCard
        item={item}
        index={index}
        scrollY={scrollY}
        rowHeight={ROW_HEIGHT}
        cardWidth={CARD_WIDTH}
        numColumns={COLUMNS}
        headerHeight={headerHeight}
        viewportHeight={SCREEN_HEIGHT}
        onPress={onAlbumPress}
      />
    ),
    [onAlbumPress, scrollY, headerHeight],
  );

  const wrappedHeader = ListHeaderComponent ? (
    <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
      {ListHeaderComponent}
    </View>
  ) : undefined;

  return (
    <View style={[{ flex: 1 }, style]}>
      <AnimatedFlatList
        ref={listRef}
        style={{ flex: 1 }}
        scrollEnabled={scrollEnabled}
        data={albums}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={COLUMNS}
        columnWrapperStyle={{ gap: GAP }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
          paddingLeft: PADDING,
          paddingRight: SCRUBBER_WIDTH,
        }}
        ListHeaderComponent={wrappedHeader}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
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
