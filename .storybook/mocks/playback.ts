/** Storybook mock for @/src/features/playback/playback barrel */

import React from "react";

// Minimal EqualizerBars mock — renders static bars
export function EqualizerBars({
  size = 16,
  color = "#D4A0FF",
  barCount = 3,
}: {
  size?: number;
  color?: string;
  barCount?: number;
}) {
  const barWidth = (size * 0.7) / barCount;
  const heights = [0.6, 0.85, 0.45];
  return React.createElement(
    "div",
    {
      style: {
        width: size,
        height: size,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: size * 0.08,
      },
    },
    ...Array.from({ length: barCount }, (_, i) =>
      React.createElement("div", {
        key: i,
        style: {
          width: barWidth,
          height: (heights[i % heights.length] ?? 0.5) * size,
          borderRadius: barWidth / 2,
          backgroundColor: color,
        },
      }),
    ),
  );
}

// Minimal playback store mock
const defaultState = {
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  positionMs: 0,
  durationMs: 0,
  queue: [],
  togglePlayPause: () => {},
  skipNext: () => {},
  skipPrevious: () => {},
  setVolume: () => {},
  skipToIndex: () => {},
};

export function usePlaybackStore(selector?: (s: typeof defaultState) => unknown) {
  return selector ? selector(defaultState) : defaultState;
}

export function setAdapterResolver() {}
export function PlaybackService() {}
export function PlayerOverlay() {
  return null;
}
export function QueueSheet() {
  return null;
}
