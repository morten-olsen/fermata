import type { ReactElement } from "react";
import { useCallback } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { AlbumRow } from "../library.store";

import { AlbumGrid } from "./album-grid";
import { BookCard } from "./book-card";

const COLUMNS = 3;
/** Portrait book covers: 4:3 aspect ratio. */
const ASPECT_RATIO = 4 / 3;

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
  const renderCard = useCallback(
    (item: AlbumRow) => (
      <BookCard
        id={item.id}
        title={item.title}
        artistName={item.artistName}
        sourceId={item.sourceId}
        artworkSourceItemId={item.artworkSourceItemId}
        progress={progressMap?.get(item.id)}
        onPress={() => onBookPress(item.id)}
      />
    ),
    [onBookPress, progressMap],
  );

  return (
    <AlbumGrid
      albums={books}
      onAlbumPress={onBookPress}
      renderCard={renderCard}
      columns={COLUMNS}
      aspectRatio={ASPECT_RATIO}
      ListHeaderComponent={ListHeaderComponent}
      style={style}
    />
  );
}
