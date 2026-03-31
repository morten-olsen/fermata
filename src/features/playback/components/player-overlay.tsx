import { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  View,
  Text,
  Pressable,
  PanResponder,
  useWindowDimensions,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { useShallow } from "zustand/react/shallow";

import { resolveArtworkUrl , useImageColors } from "@/src/features/artwork/artwork";

import { formatDuration } from "@/src/shared/lib/format";
import { Slider } from "@/src/shared/components/slider";
import { PressableScale } from "@/src/shared/components/pressable-scale";
import { colors } from "@/src/shared/theme/theme";

import { usePlaybackStore } from "../playback.store";

import { QueueSheet } from "./queue-sheet";

const TAB_BAR_HEIGHT = 85;
const SPRING_CONFIG = { damping: 28, stiffness: 340, mass: 0.8 };
const ROTATION_DURATION = 30_000;

export function PlayerOverlay() {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const {
    currentTrack, isPlaying, volume,
    togglePlayPause, skipNext, skipPrevious, setVolume,
  } = usePlaybackStore(
    useShallow((s) => ({
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      volume: s.volume,
      togglePlayPause: s.togglePlayPause,
      skipNext: s.skipNext,
      skipPrevious: s.skipPrevious,
      setVolume: s.setVolume,
    })),
  );

  const [showVolume, setShowVolume] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // --- Expand/collapse (0 = mini, 1 = full) ---
  const expand = useSharedValue(0);

  const doExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    expand.value = withSpring(1, SPRING_CONFIG);
    setIsExpanded(true);
  }, [expand]);

  const doCollapse = useCallback(() => {
    expand.value = withSpring(0, SPRING_CONFIG);
    setIsExpanded(false);
  }, [expand]);

  // PanResponder for swipe-down-to-collapse on full player
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 15 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          expand.value = 1 - gs.dy / screenHeight;
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (expand.value < 0.5 || gs.vy > 0.5) {
          expand.value = withSpring(0, SPRING_CONFIG);
          setIsExpanded(false);
        } else {
          expand.value = withSpring(1, SPRING_CONFIG);
        }
      },
    }),
  ).current;

  // --- Album art rotation ---
  const rotation = useSharedValue(0);
  const wasPlaying = useRef(false);

  const startRotation = useCallback(() => {
    const from = rotation.value % 360;
    const remaining = 360 - from;
    const remainingDuration = (remaining / 360) * ROTATION_DURATION;

    rotation.value = from;
    rotation.value = withSequence(
      withTiming(360, {
        duration: remainingDuration,
        easing: Easing.linear,
      }),
      withRepeat(
        withTiming(360, {
          duration: ROTATION_DURATION,
          easing: Easing.linear,
        }),
        -1,
      ),
    );
  }, [rotation]);

  useEffect(() => {
    if (isPlaying && !wasPlaying.current) {
      startRotation();
    } else if (!isPlaying && wasPlaying.current) {
      cancelAnimation(rotation);
      rotation.value = withTiming(rotation.value + 15, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }
    wasPlaying.current = isPlaying;
  }, [isPlaying, rotation, startRotation]);

  const artworkRotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // --- Breath animation ---
  const breathScale = useSharedValue(1);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  const handlePlayPause = useCallback(() => {
    const wasPlaying = usePlaybackStore.getState().isPlaying;
    Haptics.impactAsync(
      wasPlaying
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
    breathScale.value = withSequence(
      withSpring(wasPlaying ? 1.02 : 0.98, { damping: 12, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    togglePlayPause();
  }, [breathScale, togglePlayPause]);

  const handleMiniPlayPause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePlayPause();
  }, [togglePlayPause]);

  // --- Animated styles ---
  const fullPlayerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(expand.value, [0, 1], [screenHeight, 0]) },
    ],
  }));

  const miniPlayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expand.value, [0, 0.3], [1, 0]),
  }));

  // --- Color extraction ---
  const artworkUrl = currentTrack
    ? resolveArtworkUrl(
        currentTrack.sourceId,
        currentTrack.sourceItemId,
        "large",
      )
    : undefined;
  const albumColors = useImageColors(artworkUrl);

  if (!currentTrack) return null;

  const miniArtworkUrl = resolveArtworkUrl(
    currentTrack.sourceId,
    currentTrack.sourceItemId,
    "small",
  );

  return (
    <>
      {/* ===== Mini Player ===== */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: TAB_BAR_HEIGHT,
            left: 0,
            right: 0,
          },
          miniPlayerStyle,
        ]}
        pointerEvents={isExpanded ? "none" : "auto"}
      >
        <Pressable
          onPress={doExpand}
          style={{
            backgroundColor: colors.elevated,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: colors.surface,
                overflow: "hidden",
                marginRight: 12,
              }}
            >
              {miniArtworkUrl ? (
                <Image
                  source={{ uri: miniArtworkUrl }}
                  style={{ width: 40, height: 40 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="musical-notes"
                    size={18}
                    color={colors.muted}
                  />
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: "500",
                }}
                numberOfLines={1}
              >
                {currentTrack.title}
              </Text>
              <Text
                style={{ color: colors.textSecondary, fontSize: 12 }}
                numberOfLines={1}
              >
                {currentTrack.artistName}
              </Text>
            </View>

            <PressableScale
              onPress={handleMiniPlayPause}
              scaleValue={0.85}
              style={{ padding: 8 }}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={24}
                color={colors.text}
              />
            </PressableScale>

            <PressableScale
              onPress={skipNext}
              scaleValue={0.85}
              style={{ padding: 8 }}
            >
              <Ionicons
                name="play-skip-forward"
                size={20}
                color={colors.text}
              />
            </PressableScale>
          </View>

          <MiniProgressBar />
        </Pressable>
      </Animated.View>

      {/* ===== Full Player ===== */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.bg,
          },
          fullPlayerStyle,
        ]}
        pointerEvents={isExpanded ? "auto" : "none"}
      >
        {/* Color gradient wash — driven by album art */}
        <LinearGradient
          colors={[albumColors.primary, albumColors.secondary, colors.bg]}
          locations={[0, 0.4, 0.75]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: screenHeight * 0.6,
            opacity: 0.6,
          }}
        />

        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}
          {...panResponder.panHandlers}
        >
          {/* Drag handle */}
          <View
            style={{
              alignItems: "center",
              paddingTop: 8,
              paddingBottom: 16,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
              }}
            />
          </View>

          {/* Collapse button */}
          <Pressable onPress={doCollapse} style={{ marginBottom: 16 }}>
            <Ionicons name="chevron-down" size={28} color={colors.text} />
          </Pressable>

          {/* Album Art — rotating disc with breath */}
          <Animated.View
            style={[
              { flex: 1, alignItems: "center", justifyContent: "center" },
              breathStyle,
            ]}
          >
            <Animated.View
              style={[
                {
                  width: 300,
                  height: 300,
                  borderRadius: 150,
                  backgroundColor: colors.surface,
                  overflow: "hidden",
                },
                artworkRotationStyle,
              ]}
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
                  <Ionicons
                    name="musical-notes"
                    size={72}
                    color={colors.muted}
                  />
                </View>
              )}
            </Animated.View>
          </Animated.View>

          {/* Track Info */}
          <View style={{ marginTop: 32, marginBottom: 16 }}>
            <Text
              style={{ fontSize: 22, fontWeight: "700", color: colors.text }}
              numberOfLines={1}
            >
              {currentTrack.title}
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: colors.textSecondary,
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {currentTrack.artistName} — {currentTrack.albumTitle}
            </Text>
          </View>

          {/* Progress bar */}
          <FullProgressBar />

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
            <PressableScale
              onPress={skipPrevious}
              scaleValue={0.85}
              style={{ padding: 12 }}
            >
              <Ionicons
                name="play-skip-back"
                size={28}
                color={colors.text}
              />
            </PressableScale>

            <PressableScale
              onPress={handlePlayPause}
              scaleValue={0.9}
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
            </PressableScale>

            <PressableScale
              onPress={skipNext}
              scaleValue={0.85}
              style={{ padding: 12 }}
            >
              <Ionicons
                name="play-skip-forward"
                size={28}
                color={colors.text}
              />
            </PressableScale>
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
        <QueueSheet
          visible={showQueue}
          onDismiss={() => setShowQueue(false)}
        />
      </Animated.View>
    </>
  );
}

/** Isolated component — only re-renders when positionMs/durationMs change */
const MiniProgressBar = memo(function MiniProgressBar() {
  const positionMs = usePlaybackStore((s) => s.positionMs);
  const durationMs = usePlaybackStore((s) => s.durationMs);
  const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

  return (
    <View
      style={{
        height: 2,
        backgroundColor: colors.border,
        borderRadius: 1,
        marginTop: 8,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 2,
          width: `${progress}%`,
          backgroundColor: colors.accent,
          borderRadius: 1,
        }}
      />
    </View>
  );
});

/** Isolated component — only re-renders when positionMs/durationMs change */
const FullProgressBar = memo(function FullProgressBar() {
  const positionMs = usePlaybackStore((s) => s.positionMs);
  const durationMs = usePlaybackStore((s) => s.durationMs);
  const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

  return (
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
  );
});
