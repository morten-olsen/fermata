import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
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
  Easing,
} from "react-native-reanimated";

import { formatDuration } from "@/src/shared/lib/format";
import { Slider } from "@/src/shared/components/slider";
import { PressableScale } from "@/src/shared/components/pressable-scale";
import { colors } from "@/src/shared/theme/theme";

import { WaveformBar } from "./waveform-bar";

// ── Constants ──

const ROTATION_DURATION = 30_000;
const VINYL_HOLE_RATIO = 0.14;

// ── Color helpers ──

/** Parse a hex color to [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Lighten a hex color by mixing with white. Amount 0–1. */
function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr},${lg},${lb})`;
}

/** Create an rgba string from hex + opacity */
function withOpacity(hex: string, opacity: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${opacity})`;
}

// ── Types ──

export interface NowPlayingTrack {
  title: string;
  artistName: string;
  albumTitle: string;
}

export interface NowPlayingProps {
  currentTrack: NowPlayingTrack;
  isPlaying: boolean;
  volume: number;
  positionMs: number;
  durationMs: number;
  artworkUrl?: string;
  miniArtworkUrl?: string;
  albumColors: { primary: string; secondary: string };
  nextTrack?: { title: string } | null;

  onTogglePlayPause: () => void;
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  onSeek: (positionMs: number) => void;
  onVolumeChange: (volume: number) => void;
  onOpenQueue: () => void;
  onOpenOutputPicker?: () => void;
}

// ── Full Player ──

export function NowPlayingFull({
  currentTrack,
  isPlaying,
  volume,
  positionMs,
  durationMs,
  artworkUrl,
  albumColors,
  nextTrack,
  onTogglePlayPause,
  onSkipNext,
  onSkipPrevious,
  onSeek,
  onVolumeChange,
  onOpenQueue,
  onOpenOutputPicker,
  onCollapse,
}: NowPlayingProps & { onCollapse: () => void }) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [showVolume, setShowVolume] = useState(false);

  const artworkSize = Math.min(screenWidth - 64, 340);

  // ── Album-derived tints ──
  // Brighten the extracted colors for UI elements and atmosphere
  const tintLight = lighten(albumColors.primary, 0.5);
  const tintVibrant = lighten(albumColors.primary, 0.65);
  const progressColor = tintVibrant;
  const playButtonBg = lighten(albumColors.primary, 0.75);
  const playButtonFg = colors.bg;
  const shadowColor = withOpacity(albumColors.primary, 0.6);
  const upNextBg = withOpacity(albumColors.primary, 0.2);
  // Full-screen color wash — blended mid-tone for the entire background
  const bgWash = lighten(albumColors.primary, 0.08);
  const vinylHoleSize = artworkSize * VINYL_HOLE_RATIO;

  // ── Album art rotation (vinyl) ──

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

  const artworkRotationStyle = useAnimatedStyle(
    () => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }),
    [rotation],
  );

  // ── Breath animation ──

  const breathScale = useSharedValue(1);

  const breathStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: breathScale.value }],
    }),
    [breathScale],
  );

  const handlePlayPause = useCallback(() => {
    void Haptics.impactAsync(
      isPlaying
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
    breathScale.value = withSequence(
      withSpring(isPlaying ? 1.02 : 0.97, {
        damping: 12,
        stiffness: 300,
      }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    onTogglePlayPause();
  }, [breathScale, isPlaying, onTogglePlayPause]);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <View
      style={{
        flex: 1,
        // Tinted base — the album color is the room, not just a decoration
        backgroundColor: bgWash,
      }}
    >
      {/* Layer 1: Full-height primary wash — fills the entire screen */}
      <LinearGradient
        colors={[
          lighten(albumColors.primary, 0.18),
          lighten(albumColors.primary, 0.1),
          bgWash,
        ]}
        locations={[0, 0.5, 1]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.85,
        }}
      />

      {/* Layer 2: Secondary color — diagonal wash from top-right */}
      <LinearGradient
        colors={[
          lighten(albumColors.secondary, 0.15),
          "transparent",
        ]}
        locations={[0, 0.7]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: screenHeight * 0.7,
          opacity: 0.6,
        }}
      />

      {/* Layer 3: Fade to dark — controls need a calm, readable backdrop */}
      <LinearGradient
        colors={[
          "transparent",
          "rgba(10,10,11,0.6)",
          "rgba(10,10,11,0.92)",
          colors.bg,
        ]}
        locations={[0, 0.3, 0.7, 1]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: screenHeight * 0.55,
        }}
      />

      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        {/* Drag handle */}
        <View
          style={{
            alignItems: "center",
            paddingTop: 8,
            paddingBottom: 4,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              opacity: 0.6,
            }}
          />
        </View>

        {/* Header row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 8,
          }}
        >
          <Pressable
            onPress={onCollapse}
            hitSlop={12}
            style={{ padding: 4 }}
          >
            <Ionicons name="chevron-down" size={26} color={colors.text} />
          </Pressable>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: colors.textSecondary,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
            numberOfLines={1}
          >
            {currentTrack.albumTitle}
          </Text>
          <Pressable
            onPress={onOpenQueue}
            hitSlop={12}
            style={{ padding: 4 }}
          >
            <Ionicons name="list" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* ── Album Art (vinyl disc) ── */}
        <Animated.View
          style={[
            {
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            },
            breathStyle,
          ]}
        >
          {/* CD disc — reflective silver ring behind the artwork */}
          <View
            style={{
              position: "absolute",
              width: artworkSize + 40,
              height: artworkSize + 40,
              borderRadius: (artworkSize + 40) / 2,
              backgroundColor: "rgba(180,180,195,0.08)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            }}
          />
          {/* Shadow disc — album-colored glow */}
          <View
            style={{
              position: "absolute",
              width: artworkSize + 24,
              height: artworkSize + 24,
              borderRadius: (artworkSize + 24) / 2,
              backgroundColor: shadowColor,
              shadowColor: tintLight,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.35,
              shadowRadius: 30,
              elevation: 20,
            }}
          />

          <Animated.View
            style={[
              {
                width: artworkSize,
                height: artworkSize,
                borderRadius: artworkSize / 2,
                backgroundColor: colors.surface,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
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
                  size={64}
                  color={colors.muted}
                />
              </View>
            )}

            {/* CD center hole */}
            <View
              style={{
                position: "absolute",
                width: vinylHoleSize,
                height: vinylHoleSize,
                borderRadius: vinylHoleSize / 2,
                backgroundColor: colors.bg,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            />
          </Animated.View>
        </Animated.View>

        {/* ── Track Info ── */}
        <View style={{ paddingHorizontal: 32, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: colors.text,
              letterSpacing: -0.3,
            }}
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
            {currentTrack.artistName}
          </Text>
        </View>

        {/* ── Progress (waveform) ── */}
        <View style={{ paddingHorizontal: 32 }}>
          <WaveformBar
            progress={progress}
            seed={`${currentTrack.title}-${currentTrack.artistName}-${durationMs}`}
            activeColor={progressColor}
            onSeek={(v) => onSeek(v * durationMs)}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 2,
            }}
          >
            <Text
              style={{ color: colors.muted, fontSize: 11, fontWeight: "500" }}
            >
              {formatDuration(positionMs / 1000)}
            </Text>
            <Text
              style={{ color: colors.muted, fontSize: 11, fontWeight: "500" }}
            >
              {durationMs > 0
                ? `-${formatDuration((durationMs - positionMs) / 1000)}`
                : "0:00"}
            </Text>
          </View>
        </View>

        {/* ── Transport Controls ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
            marginTop: 20,
            marginBottom: 12,
          }}
        >
          <PressableScale
            onPress={onSkipPrevious}
            scaleValue={0.85}
            style={{ padding: 12 }}
          >
            <Ionicons name="play-skip-back" size={28} color={colors.text} />
          </PressableScale>

          <PressableScale
            onPress={handlePlayPause}
            scaleValue={0.9}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: playButtonBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={32}
              color={playButtonFg}
              style={!isPlaying ? { marginLeft: 3 } : undefined}
            />
          </PressableScale>

          <PressableScale
            onPress={onSkipNext}
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

        {/* ── Volume (toggled) ── */}
        {showVolume && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 32,
              marginBottom: 4,
              gap: 12,
            }}
          >
            <Ionicons name="volume-low" size={16} color={colors.muted} />
            <View style={{ flex: 1 }}>
              <Slider
                value={volume}
                onValueChange={onVolumeChange}
                fillColor={progressColor}
                trackColor={colors.surface}
              />
            </View>
            <Ionicons name="volume-high" size={16} color={colors.muted} />
          </View>
        )}

        {/* ── Bottom row ── */}
        <View
          style={{
            paddingHorizontal: 28,
            paddingBottom: 16,
            marginTop: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Pressable
                onPress={() => setShowVolume((v) => !v)}
                hitSlop={8}
                style={{ padding: 8 }}
              >
                <Ionicons
                  name={showVolume ? "volume-high" : "volume-high-outline"}
                  size={20}
                  color={showVolume ? colors.text : colors.muted}
                />
              </Pressable>
              {onOpenOutputPicker && (
                <Pressable
                  onPress={onOpenOutputPicker}
                  hitSlop={8}
                  style={{ padding: 8 }}
                >
                  <Ionicons
                    name="radio-outline"
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              )}
            </View>

            {nextTrack && (
              <Pressable
                onPress={onOpenQueue}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  backgroundColor: upNextBg,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "500",
                    color: colors.muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Next
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    maxWidth: 160,
                  }}
                  numberOfLines={1}
                >
                  {nextTrack.title}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={onOpenQueue}
              hitSlop={8}
              style={{ padding: 8 }}
            >
              <Ionicons name="list" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Mini Player ──

export function NowPlayingMini({
  currentTrack,
  isPlaying,
  positionMs,
  durationMs,
  miniArtworkUrl,
  albumColors,
  onTogglePlayPause,
  onSkipNext,
  onExpand,
  onOpenOutputPicker,
}: Pick<
  NowPlayingProps,
  | "currentTrack"
  | "isPlaying"
  | "positionMs"
  | "durationMs"
  | "miniArtworkUrl"
  | "albumColors"
  | "onTogglePlayPause"
  | "onSkipNext"
  | "onOpenOutputPicker"
> & { onExpand: () => void }) {
  const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;
  const miniProgressColor = lighten(albumColors.primary, 0.6);
  const miniBg = withOpacity(albumColors.primary, 0.2);

  const handlePlayPause = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTogglePlayPause();
  }, [onTogglePlayPause]);

  return (
    <Pressable
      onPress={onExpand}
      style={{
        backgroundColor: colors.elevated,
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
      }}
    >
      {/* Album-tinted backdrop */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: miniBg,
        }}
      />
      {/* Progress line — album-tinted */}
      <View
        style={{
          height: 2,
          backgroundColor: "transparent",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 2,
            width: `${progress}%`,
            backgroundColor: miniProgressColor,
          }}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        {/* Artwork */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: colors.surface,
            overflow: "hidden",
            marginRight: 12,
          }}
        >
          {miniArtworkUrl ? (
            <Image
              source={{ uri: miniArtworkUrl }}
              style={{ width: 44, height: 44 }}
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

        {/* Track info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
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

        {/* Output picker */}
        {onOpenOutputPicker && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onOpenOutputPicker();
            }}
            hitSlop={6}
            style={{ padding: 8 }}
          >
            <Ionicons name="radio-outline" size={18} color={colors.muted} />
          </Pressable>
        )}

        {/* Play/pause */}
        <PressableScale
          onPress={handlePlayPause}
          scaleValue={0.85}
          style={{ padding: 8 }}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={24}
            color={colors.text}
          />
        </PressableScale>

        {/* Skip */}
        <PressableScale
          onPress={onSkipNext}
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
    </Pressable>
  );
}
