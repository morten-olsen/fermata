import type { ReactElement } from "react";
import { useCallback, useMemo, useRef, useState, memo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View, FlatList } from "react-native";

import { useCurrentTrack } from "@/src/hooks/playback/playback";

import type { TrackRow as TrackRowType } from "@/src/services/database/database.schemas";

import { AlphabetScrubber } from "@/src/shared/components/alphabet-scrubber";
import { extractLetters } from "@/src/shared/lib/alphabet";


import { TrackRow } from "./track-row";

const TRACK_ROW_HEIGHT = 56;
const SCRUBBER_WIDTH = 36;

interface TrackListProps {
  tracks: TrackRowType[];
  onTrackPress: (trackId: string) => void;
  onTrackMorePress?: (track: TrackRowType) => void;
  onToggleFavourite?: (track: TrackRowType) => void;
  ListHeaderComponent?: ReactElement;
  style?: StyleProp<ViewStyle>;
}

export function TrackList({
  tracks,
  onTrackPress,
  onTrackMorePress,
  onToggleFavourite,
  ListHeaderComponent,
  style,
}: TrackListProps) {
  const listRef = useRef<FlatList>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const { letters, indices } = useMemo(
    () =>
      extractLetters(
        tracks.map((t) => ({ key: t.title })),
        (item) => item.key
      ),
    [tracks]
  );

  const handleSelect = useCallback(
    (letter: string) => {
      const index = indices[letter];
      if (index == null || !listRef.current) return;
      listRef.current.scrollToOffset({
        offset: index * TRACK_ROW_HEIGHT,
        animated: true,
      });
    },
    [indices]
  );

  const renderItem = useCallback(
    ({ item }: { item: TrackRowType }) => (
      <TrackListItem
        item={item}
        onTrackPress={onTrackPress}
        onTrackMorePress={onTrackMorePress}
        onToggleFavourite={onToggleFavourite}
      />
    ),
    [onTrackPress, onTrackMorePress, onToggleFavourite]
  );

  return (
    <View style={[{ flex: 1 }, style]}>
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        scrollEnabled={scrollEnabled}
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        getItemLayout={getTrackItemLayout}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
          paddingLeft: 16,
          paddingRight: SCRUBBER_WIDTH,
        }}
        ListHeaderComponent={ListHeaderComponent}
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

const getTrackItemLayout = (_data: unknown, index: number) => ({
  length: TRACK_ROW_HEIGHT,
  offset: TRACK_ROW_HEIGHT * index,
  index,
});

/**
 * Each item subscribes to currentTrack.id directly from the playback store.
 * Only the row that starts/stops playing re-renders — not the entire list.
 */
const TrackListItem = memo(function TrackListItem({
  item,
  onTrackPress,
  onTrackMorePress,
  onToggleFavourite,
}: {
  item: TrackRowType;
  onTrackPress: (trackId: string) => void;
  onTrackMorePress?: (track: TrackRowType) => void;
  onToggleFavourite?: (track: TrackRowType) => void;
}) {
  const { data: currentTrack } = useCurrentTrack();
  const isPlaying = currentTrack?.id === item.id;

  const handlePress = useCallback(() => onTrackPress(item.id), [onTrackPress, item.id]);
  const handleMore = useCallback(
    () => onTrackMorePress?.(item),
    [onTrackMorePress, item],
  );
  const handleFav = useCallback(
    () => onToggleFavourite?.(item),
    [onToggleFavourite, item],
  );

  return (
    <TrackRow
      title={item.title}
      artistName={item.artistName}
      duration={item.duration}
      trackNumber={item.trackNumber}
      isPlaying={isPlaying}
      isFavourite={!!item.isFavourite}
      onPress={handlePress}
      onMorePress={onTrackMorePress ? handleMore : undefined}
      onToggleFavourite={onToggleFavourite ? handleFav : undefined}
    />
  );
});
