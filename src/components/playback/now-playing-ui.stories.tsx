import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { NowPlayingFull, NowPlayingMini } from "./now-playing-ui";

// ── Shared mock data ──

const mockTrack = {
  title: "Everything In Its Right Place",
  artistName: "Radiohead",
  albumTitle: "Kid A",
};

const mockColors = { primary: "#3B6D8F", secondary: "#8F5A3B" };

const noop = () => {};

// ── NowPlayingFull ──

const fullMeta: Meta<typeof NowPlayingFull> = {
  title: "playback/NowPlayingFull",
  component: NowPlayingFull,
  decorators: [
    (Story) => (
      <View style={{ width: 390, height: 750, overflow: "hidden", borderRadius: 20 }}>
        <Story />
      </View>
    ),
  ],
};
export default fullMeta;

type FullStory = StoryObj<typeof NowPlayingFull>;

export const Playing: FullStory = {
  args: {
    currentTrack: mockTrack,
    isPlaying: true,
    volume: 0.7,
    positionMs: 94_000,
    durationMs: 262_000,
    artworkUrl: "https://picsum.photos/seed/kida/400",
    albumColors: mockColors,
    nextTrack: { title: "The National Anthem" },
    onTogglePlayPause: noop,
    onSkipNext: noop,
    onSkipPrevious: noop,
    onSeek: noop,
    onVolumeChange: noop,
    onOpenQueue: noop,
    onOpenOutputPicker: noop,
    onCollapse: noop,
  },
};

export const Paused: FullStory = {
  args: {
    ...Playing.args,
    isPlaying: false,
    positionMs: 42_000,
  },
};

export const NoArtwork: FullStory = {
  args: {
    ...Playing.args,
    artworkUrl: undefined,
    albumColors: { primary: "#444455", secondary: "#554444" },
    nextTrack: null,
  },
};

export const WarmTones: FullStory = {
  args: {
    ...Playing.args,
    currentTrack: {
      title: "Redbone",
      artistName: "Childish Gambino",
      albumTitle: "Awaken, My Love!",
    },
    artworkUrl: "https://picsum.photos/seed/redbone/400",
    albumColors: { primary: "#8B2500", secondary: "#DAA520" },
    positionMs: 180_000,
    durationMs: 327_000,
  },
};
