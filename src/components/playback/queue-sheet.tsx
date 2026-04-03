import { View, Text, FlatList, Pressable } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { BottomSheet } from "@/src/shared/components/bottom-sheet";
import { formatDuration } from "@/src/shared/lib/format";
import { colors } from "@/src/shared/theme/theme";

import { usePlaybackQueue, useSkipToIndex } from "@/src/hooks/playback/playback";

interface QueueSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export function QueueSheet({ visible, onDismiss }: QueueSheetProps) {
  const { data } = usePlaybackQueue();
  const { mutate: skipToIndex } = useSkipToIndex();

  const queue = data?.queue ?? [];
  const currentTrack = data?.currentTrack ?? null;

  const currentIndex = currentTrack
    ? queue.findIndex((t) => t.id === currentTrack.id)
    : -1;

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <View style={{ paddingHorizontal: 20, maxHeight: 420 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
            }}
          >
            Queue
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {queue.length} {queue.length === 1 ? "track" : "tracks"}
          </Text>
        </View>

        {queue.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: 32,
            }}
          >
            <Ionicons name="list" size={36} color={colors.border} />
            <Text
              style={{
                color: colors.muted,
                fontSize: 14,
                marginTop: 12,
              }}
            >
              Nothing in the queue
            </Text>
          </View>
        ) : (
          <FlatList
            data={queue}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            initialScrollIndex={currentIndex > 0 ? currentIndex : undefined}
            getItemLayout={(_, index) => ({
              length: 56,
              offset: 56 * index,
              index,
            })}
            renderItem={({ item, index }) => {
              const isCurrent = item.id === currentTrack?.id;
              return (
                <Pressable
                  onPress={() => {
                    void skipToIndex(index);
                    onDismiss();
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      height: 56,
                      paddingHorizontal: 4,
                      borderRadius: 10,
                      backgroundColor: isCurrent
                        ? colors.elevated
                        : "transparent",
                    }}
                  >
                    {/* Position / playing indicator */}
                    <View style={{ width: 28, alignItems: "center" }}>
                      {isCurrent ? (
                        <Ionicons
                          name="volume-high"
                          size={14}
                          color={colors.accent}
                        />
                      ) : (
                        <Text style={{ color: colors.muted, fontSize: 13 }}>
                          {index + 1}
                        </Text>
                      )}
                    </View>

                    {/* Track info */}
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "500",
                          color: isCurrent ? colors.accent : colors.text,
                        }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: colors.textSecondary }}
                        numberOfLines={1}
                      >
                        {item.artistName}
                      </Text>
                    </View>

                    {/* Duration */}
                    <Text style={{ fontSize: 13, color: colors.muted }}>
                      {formatDuration(item.duration)}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}

        <View style={{ height: 8 }} />
      </View>
    </BottomSheet>
  );
}
