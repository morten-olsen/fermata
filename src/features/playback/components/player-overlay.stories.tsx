import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { NowPlayingFull, NowPlayingMini } from "./now-playing-ui";

const MOCK_TRACK = {
  title: "Exit Music (For a Film)",
  artistName: "Radiohead",
  albumTitle: "OK Computer",
};

const MOCK_NEXT = { title: "Let Down" };

const noop = () => {};

const defaultProps = {
  currentTrack: MOCK_TRACK,
  volume: 0.8,
  positionMs: 92_000,
  durationMs: 264_000,
  artworkUrl: undefined,
  miniArtworkUrl: undefined,
  nextTrack: MOCK_NEXT,
  onTogglePlayPause: noop,
  onSkipNext: noop,
  onSkipPrevious: noop,
  onSeek: noop,
  onVolumeChange: noop,
  onOpenQueue: noop,
  onCollapse: noop,
};

const meta: Meta = {
  title: "playback/PlayerOverlay",
  parameters: {
    layout: "fullscreen",
  },
};
export default meta;

type Story = StoryObj;

export const FullPlayer: Story = {
  render: () => (
    <View style={{ width: 390, height: 780, alignSelf: "center" }}>
      <NowPlayingFull
        {...defaultProps}
        isPlaying
        albumColors={{ primary: "#1a2a1a", secondary: "#0d1f2d" }}
      />
    </View>
  ),
};

export const Paused: Story = {
  render: () => (
    <View style={{ width: 390, height: 780, alignSelf: "center" }}>
      <NowPlayingFull
        {...defaultProps}
        isPlaying={false}
        albumColors={{ primary: "#1a2a1a", secondary: "#0d1f2d" }}
      />
    </View>
  ),
};

export const WarmPalette: Story = {
  render: () => (
    <View style={{ width: 390, height: 780, alignSelf: "center" }}>
      <NowPlayingFull
        {...defaultProps}
        isPlaying
        albumColors={{ primary: "#2d1a0a", secondary: "#1a0a1d" }}
      />
    </View>
  ),
};

export const CoolPalette: Story = {
  render: () => (
    <View style={{ width: 390, height: 780, alignSelf: "center" }}>
      <NowPlayingFull
        {...defaultProps}
        isPlaying
        albumColors={{ primary: "#0a1a2d", secondary: "#0d2a1a" }}
      />
    </View>
  ),
};

export const NoNextTrack: Story = {
  render: () => (
    <View style={{ width: 390, height: 780, alignSelf: "center" }}>
      <NowPlayingFull
        {...defaultProps}
        isPlaying
        nextTrack={null}
        albumColors={{ primary: "#1a1a2d", secondary: "#0d1f2d" }}
      />
    </View>
  ),
};

export const MiniPlayer: Story = {
  render: () => (
    <View style={{ width: 390, alignSelf: "center" }}>
      <NowPlayingMini
        currentTrack={MOCK_TRACK}
        isPlaying
        positionMs={92_000}
        durationMs={264_000}
        miniArtworkUrl={undefined}
        albumColors={{ primary: "#1a2a1a", secondary: "#0d1f2d" }}
        onTogglePlayPause={noop}
        onSkipNext={noop}
        onExpand={noop}
      />
    </View>
  ),
};

export const MiniPlayerPaused: Story = {
  render: () => (
    <View style={{ width: 390, alignSelf: "center" }}>
      <NowPlayingMini
        currentTrack={MOCK_TRACK}
        isPlaying={false}
        positionMs={92_000}
        durationMs={264_000}
        miniArtworkUrl={undefined}
        albumColors={{ primary: "#1a2a1a", secondary: "#0d1f2d" }}
        onTogglePlayPause={noop}
        onSkipNext={noop}
        onExpand={noop}
      />
    </View>
  ),
};
