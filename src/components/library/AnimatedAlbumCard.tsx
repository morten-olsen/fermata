import { useCallback, memo } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";

import { AlbumCard } from "./AlbumCard";
import type { AlbumRow } from "@/src/stores/library";

interface AnimatedAlbumCardProps {
  item: AlbumRow;
  index: number;
  scrollY: SharedValue<number>;
  rowHeight: number;
  cardWidth: number;
  numColumns: number;
  headerHeight: number;
  viewportHeight: number;
  onPress: (id: string) => void;
}

export const AnimatedAlbumCard = memo(function AnimatedAlbumCard({
  item,
  index,
  scrollY,
  rowHeight,
  cardWidth,
  numColumns,
  headerHeight,
  viewportHeight,
  onPress,
}: AnimatedAlbumCardProps) {
  const rowIndex = Math.floor(index / numColumns);
  // Item's position from top of content
  const itemTop = headerHeight + rowIndex * rowHeight;

  const animatedStyle = useAnimatedStyle(() => {
    // Item's position relative to viewport
    const viewportPos = itemTop - scrollY.value;
    const center = viewportHeight / 2;
    const distFromCenter = Math.abs(viewportPos + rowHeight / 2 - center);
    // Fade zone: items beyond 80% of half-viewport start fading
    const fadeDistance = viewportHeight * 0.5;

    const scale = interpolate(
      distFromCenter,
      [0, fadeDistance],
      [1, 0.97],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      distFromCenter,
      [0, fadeDistance],
      [1, 0.8],
      Extrapolation.CLAMP,
    );

    return { transform: [{ scale }], opacity };
  });

  const handlePress = useCallback(() => onPress(item.id), [item.id, onPress]);

  return (
    <Animated.View style={[{ width: cardWidth }, animatedStyle]}>
      <AlbumCard
        id={item.id}
        title={item.title}
        artistName={item.artistName}
        year={item.year}
        sourceId={item.sourceId}
        artworkSourceItemId={item.artworkSourceItemId}
        onPress={handlePress}
      />
    </Animated.View>
  );
});
