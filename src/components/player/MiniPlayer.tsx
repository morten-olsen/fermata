import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { usePlaybackStore } from "@/src/stores/playback";
import { resolveArtworkUrl } from "@/src/lib/artwork";
import { colors } from "@/src/theme";

export function MiniPlayer() {
  const { currentTrack, isPlaying, positionMs, durationMs, togglePlayPause, skipNext } =
    usePlaybackStore();

  if (!currentTrack) return null;

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePlayPause();
  };

  const artworkUrl = resolveArtworkUrl(
    currentTrack.sourceId,
    currentTrack.sourceItemId,
    "small"
  );

  const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

  return (
    <Pressable
      onPress={() => router.push("/player")}
      className="bg-fermata-elevated border-t border-fermata-border px-4 py-3"
    >
      <View className="flex-row items-center">
        {/* Mini artwork */}
        <View className="w-10 h-10 rounded-lg bg-fermata-surface overflow-hidden mr-3">
          {artworkUrl ? (
            <Image
              source={{ uri: artworkUrl }}
              style={{ width: 40, height: 40 }}
              contentFit="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="musical-notes" size={18} color={colors.muted} />
            </View>
          )}
        </View>

        {/* Track info */}
        <View className="flex-1">
          <Text className="text-fermata-text text-sm font-medium" numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text className="text-fermata-text-secondary text-xs" numberOfLines={1}>
            {currentTrack.artistName}
          </Text>
        </View>

        {/* Play/Pause */}
        <Pressable onPress={handlePlayPause} className="p-2">
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={24}
            color={colors.text}
          />
        </Pressable>

        {/* Skip */}
        <Pressable onPress={skipNext} className="p-2">
          <Ionicons name="play-skip-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View className="h-0.5 bg-fermata-border rounded-full mt-2 overflow-hidden">
        <View
          className="h-0.5 bg-fermata-accent rounded-full"
          style={{ width: `${progress}%` }}
        />
      </View>
    </Pressable>
  );
}
