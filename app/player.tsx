import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { usePlaybackStore } from "@/src/stores/playback";
import { resolveArtworkUrl } from "@/src/lib/artwork";
import { formatDuration } from "@/src/lib/utils";
import { Slider } from "@/src/components/common/Slider";
import { QueueSheet } from "@/src/components/player/QueueSheet";
import { colors } from "@/src/theme";

export default function PlayerScreen() {
  const {
    currentTrack,
    isPlaying,
    positionMs,
    durationMs,
    volume,
    togglePlayPause,
    skipNext,
    skipPrevious,
    setVolume,
  } = usePlaybackStore();

  const [showVolume, setShowVolume] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePlayPause();
  };

  const artworkUrl = currentTrack
    ? resolveArtworkUrl(currentTrack.sourceId, currentTrack.sourceItemId, "large")
    : undefined;

  const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Drag handle + collapse */}
        <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 16 }}>
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
            }}
          />
        </View>

        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </Pressable>

        {/* Album Art */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View
            style={{
              width: 320,
              height: 320,
              borderRadius: 16,
              backgroundColor: colors.surface,
              overflow: "hidden",
            }}
          >
            {artworkUrl ? (
              <Image
                source={{ uri: artworkUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="musical-notes" size={72} color={colors.muted} />
              </View>
            )}
          </View>
        </View>

        {/* Track Info */}
        <View style={{ marginTop: 32, marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: colors.text,
            }}
            numberOfLines={1}
          >
            {currentTrack?.title ?? "Not Playing"}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: colors.textSecondary,
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            {currentTrack
              ? `${currentTrack.artistName} — ${currentTrack.albumTitle}`
              : "Select a track to begin"}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={{ marginBottom: 8 }}>
          <View
            style={{
              height: 4,
              backgroundColor: colors.surface,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 4,
                width: `${progress}%`,
                backgroundColor: colors.accent,
                borderRadius: 2,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {formatDuration(positionMs / 1000)}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {formatDuration(durationMs / 1000)}
            </Text>
          </View>
        </View>

        {/* Transport controls */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
            marginBottom: 16,
          }}
        >
          <Pressable onPress={skipPrevious} style={{ padding: 12 }}>
            <Ionicons name="play-skip-back" size={28} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={handlePlayPause}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.text,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={32}
              color={colors.bg}
            />
          </Pressable>

          <Pressable onPress={skipNext} style={{ padding: 12 }}>
            <Ionicons name="play-skip-forward" size={28} color={colors.text} />
          </Pressable>
        </View>

        {/* Volume slider (toggled) */}
        {showVolume && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
              gap: 12,
            }}
          >
            <Ionicons name="volume-low" size={18} color={colors.muted} />
            <View style={{ flex: 1 }}>
              <Slider value={volume} onValueChange={setVolume} />
            </View>
            <Ionicons name="volume-high" size={18} color={colors.muted} />
          </View>
        )}

        {/* Bottom row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 16,
          }}
        >
          <Pressable
            onPress={() => setShowVolume((v) => !v)}
            style={{ padding: 12 }}
          >
            <Ionicons
              name={showVolume ? "volume-high" : "volume-high-outline"}
              size={22}
              color={showVolume ? colors.text : colors.muted}
            />
          </Pressable>
          <Pressable
            onPress={() => setShowQueue(true)}
            style={{ padding: 12 }}
          >
            <Ionicons name="list" size={22} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      {/* Queue bottom sheet */}
      <QueueSheet visible={showQueue} onDismiss={() => setShowQueue(false)} />
    </SafeAreaView>
  );
}
