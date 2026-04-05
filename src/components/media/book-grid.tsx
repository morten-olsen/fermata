import type { ReactElement } from "react";
import { useCallback } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { AudiobookRow } from "@/src/services/database/database.schemas";

import { useColumns } from "@/src/components/layout/layout";
import { MediaCard } from "@/src/components/data-display/data-display";

import { AlbumGrid } from "./album-grid";

/** Portrait book covers: 4:3 aspect ratio. */
const ASPECT_RATIO = 4 / 3;

interface BookGridProps {
  books: AudiobookRow[];
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
  const columns = useColumns({ base: 3, sm: 4, md: 5, lg: 6, xl: 7 });

  const renderCard = useCallback(
    (item: AudiobookRow) => (
      <MediaCard.Book
        id={item.id}
        title={item.title}
        artistName={item.authorName}
        artworkUri={item.artworkUri}
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
      columns={columns}
      aspectRatio={ASPECT_RATIO}
      ListHeaderComponent={ListHeaderComponent}
      style={style}
    />
  );
}
