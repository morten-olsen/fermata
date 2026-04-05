import { memo, useCallback } from "react";
import type { ReactElement } from "react";
import { View, FlatList } from "react-native";

interface HorizontalListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  /** Width of each item container. @default 130 */
  itemWidth?: number;
  /** Gap between items. @default 12 */
  gap?: number;
}

function HorizontalListInner<T>({
  data,
  keyExtractor,
  renderItem,
  itemWidth = 130,
  gap = 12,
}: HorizontalListProps<T>) {
  const renderFlatItem = useCallback(
    ({ item }: { item: T }) => (
      <View style={{ width: itemWidth, marginRight: gap }}>
        {renderItem(item)}
      </View>
    ),
    [renderItem, itemWidth, gap],
  );

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderFlatItem}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    />
  );
}

export const HorizontalList = memo(HorizontalListInner) as typeof HorizontalListInner;
