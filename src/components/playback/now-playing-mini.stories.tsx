import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { NowPlayingMini } from "./now-playing-ui";

const mockTrack = {
  title: "Everything In Its Right Place",
  artistName: "Radiohead",
  albumTitle: "Kid A",
};

const noop = () => {};

const meta: Meta<typeof NowPlayingMini> = {
  title: "playback/NowPlayingMini",
  component: NowPlayingMini,
  decorators: [
    (Story) => (
      <View style={{ width: 390 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof NowPlayingMini>;

export const Playing: Story = {
  args: {
    currentTrack: mockTrack,
    isPlaying: true,
    positionMs: 94_000,
    durationMs: 262_000,
    miniArtworkUrl: "https://picsum.photos/seed/kida/88",
    albumColors: { primary: "#3B6D8F", secondary: "#8F5A3B" },
    onTogglePlayPause: noop,
    onSkipNext: noop,
    onExpand: noop,
    onOpenOutputPicker: noop,
  },
};

export const Paused: Story = {
  args: {
    ...Playing.args,
    isPlaying: false,
    positionMs: 42_000,
  },
};

export const NoArtwork: Story = {
  args: {
    ...Playing.args,
    miniArtworkUrl: undefined,
    albumColors: { primary: "#444455", secondary: "#554444" },
  },
};

export const WarmTones: Story = {
  args: {
    ...Playing.args,
    currentTrack: {
      title: "Redbone",
      artistName: "Childish Gambino",
      albumTitle: "Awaken, My Love!",
    },
    miniArtworkUrl: "https://picsum.photos/seed/redbone/88",
    albumColors: { primary: "#8B2500", secondary: "#DAA520" },
  },
};

export const LongTitle: Story = {
  args: {
    ...Playing.args,
    currentTrack: {
      title: "The Girl With All The Gifts (Original Motion Picture Soundtrack)",
      artistName: "Cristobal Tapia de Veer",
      albumTitle: "The Girl With All The Gifts",
    },
  },
};
