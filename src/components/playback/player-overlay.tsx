import { useState, useRef, useCallback } from "react";
import { PanResponder, useWindowDimensions } from "react-native";

import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";

import { useImageColors } from "@/src/hooks/use-image-colors";
import {
  usePlaybackState,
  useTogglePlayPause,
  useSkipNext,
  useSkipPrevious,
  useSeekTo,
  useSetVolume,
} from "@/src/hooks/playback/playback";

import { OutputPicker } from "@/src/components/outputs/output-picker";

import { colors } from "@/src/shared/theme/theme";

import { NowPlayingFull, NowPlayingMini } from "./now-playing-ui";
import { QueueSheet } from "./queue-sheet";

const TAB_BAR_HEIGHT = 85;
const SPRING_CONFIG = { damping: 28, stiffness: 340, mass: 0.8 };

export function PlayerOverlay() {
  const { height: screenHeight } = useWindowDimensions();

  const { data: state } = usePlaybackState();
  const { mutate: togglePlayPause } = useTogglePlayPause();
  const { mutate: skipNext } = useSkipNext();
  const { mutate: skipPrevious } = useSkipPrevious();
  const { mutate: seekTo } = useSeekTo();
  const { mutate: setVolume } = useSetVolume();

  const currentTrack = state?.currentTrack ?? null;
  const isPlaying = state?.status === 'playing';
  const volume = state?.volume ?? 1;
  const queue = state?.queue ?? [];
  const positionMs = state?.positionMs ?? 0;
  const durationMs = state?.durationMs ?? 0;

  const [showQueue, setShowQueue] = useState(false);
  const [showOutputPicker, setShowOutputPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // ── Expand / collapse ──

  const expand = useSharedValue(0);

  const doExpand = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    expand.value = withSpring(1, SPRING_CONFIG);
    setIsExpanded(true);
  }, [expand]);

  const doCollapse = useCallback(() => {
    expand.value = withSpring(0, SPRING_CONFIG);
    setIsExpanded(false);
  }, [expand]);

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

  // ── Animated styles ──

  const fullPlayerStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateY: interpolate(expand.value, [0, 1], [screenHeight, 0]),
        },
      ],
    }),
    [expand, screenHeight],
  );

  const miniPlayerStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(expand.value, [0, 0.3], [1, 0]),
    }),
    [expand],
  );

  // ── Artwork & colors ──

  const artworkUrl = currentTrack?.artworkUri ?? undefined;
  const miniArtworkUrl = artworkUrl; // Same URI — Image component handles sizing
  const albumColors = useImageColors(artworkUrl);

  // ── Up next ──

  const currentIndex = currentTrack
    ? queue.findIndex((t) => t.id === currentTrack.id)
    : -1;
  const nextTrack =
    currentIndex >= 0 && currentIndex < queue.length - 1
      ? queue[currentIndex + 1]
      : null;

  if (!currentTrack) return null;

  return (
    <>
      {/* Mini Player */}
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
        <NowPlayingMini
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          positionMs={positionMs}
          durationMs={durationMs}
          miniArtworkUrl={miniArtworkUrl}
          albumColors={albumColors}
          onTogglePlayPause={() => void togglePlayPause(undefined)}
          onSkipNext={() => void skipNext(undefined)}
          onExpand={doExpand}
          onOpenOutputPicker={() => setShowOutputPicker(true)}
        />
      </Animated.View>

      {/* Full Player */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.bg,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: "hidden",
          },
          fullPlayerStyle,
        ]}
        pointerEvents={isExpanded ? "auto" : "none"}
        {...panResponder.panHandlers}
      >
        <NowPlayingFull
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          volume={volume}
          positionMs={positionMs}
          durationMs={durationMs}
          artworkUrl={artworkUrl}
          albumColors={albumColors}
          nextTrack={nextTrack}
          onTogglePlayPause={() => void togglePlayPause(undefined)}
          onSkipNext={() => void skipNext(undefined)}
          onSkipPrevious={() => void skipPrevious(undefined)}
          onSeek={(ms) => void seekTo(ms)}
          onVolumeChange={(v) => void setVolume(v)}
          onOpenQueue={() => setShowQueue(true)}
          onOpenOutputPicker={() => setShowOutputPicker(true)}
          onCollapse={doCollapse}
        />

        <QueueSheet
          visible={showQueue}
          onDismiss={() => setShowQueue(false)}
        />
      </Animated.View>

      {/* Output picker — outside both animated views so it's accessible from mini and full player */}
      <OutputPicker
        visible={showOutputPicker}
        onDismiss={() => setShowOutputPicker(false)}
      />
    </>
  );
}
