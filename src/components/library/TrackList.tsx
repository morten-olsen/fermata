import { useCallback, useMemo, useRef, useState, ReactElement } from "react";
import { View, FlatList, StyleProp, ViewStyle } from "react-native";
import { TrackRow } from "./TrackRow";
import { AlphabetScrubber } from "@/src/components/common/AlphabetScrubber";
import { extractLetters } from "@/src/lib/alphabet";
import type { TrackRow as TrackRowType } from "@/src/stores/library";

const TRACK_ROW_HEIGHT = 56;
const SCRUBBER_WIDTH = 36;

interface TrackListProps {
  tracks: TrackRowType[];
  onTrackPress: (trackId: string) => void;
  onTrackMorePress?: (track: TrackRowType) => void;
  onToggleFavourite?: (track: TrackRowType) => void;
  currentTrackId?: string | null;
  ListHeaderComponent?: ReactElement;
  style?: StyleProp<ViewStyle>;
}

export function TrackList({
  tracks,
  onTrackPress,
  onTrackMorePress,
  onToggleFavourite,
  currentTrackId,
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
      <TrackRow
        title={item.title}
        artistName={item.artistName}
        duration={item.duration}
        trackNumber={item.trackNumber}
        isPlaying={currentTrackId === item.id}
        isFavourite={!!item.isFavourite}
        onPress={() => onTrackPress(item.id)}
        onMorePress={onTrackMorePress ? () => onTrackMorePress(item) : undefined}
        onToggleFavourite={
          onToggleFavourite ? () => onToggleFavourite(item) : undefined
        }
      />
    ),
    [onTrackPress, onTrackMorePress, onToggleFavourite, currentTrackId]
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
