import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { TrackRow } from "./track-row";

const meta: Meta<typeof TrackRow> = {
  title: "library/TrackRow",
  component: TrackRow,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: "100%", maxWidth: 480 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    onPress: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof TrackRow>;

export const Default: Story = {
  args: {
    title: "Everything In Its Right Place",
    artistName: "Radiohead",
    duration: 251,
    trackNumber: 1,
  },
};

export const NowPlaying: Story = {
  args: {
    title: "Exit Music (For a Film)",
    artistName: "Radiohead",
    duration: 264,
    trackNumber: 4,
    isPlaying: true,
  },
};

export const Favourited: Story = {
  args: {
    title: "Lucky",
    artistName: "Radiohead",
    duration: 259,
    trackNumber: 7,
    isFavourite: true,
    onToggleFavourite: () => {},
  },
};

export const Downloaded: Story = {
  args: {
    title: "Paranoid Android",
    artistName: "Radiohead",
    duration: 383,
    trackNumber: 2,
    isDownloaded: true,
  },
};

export const Queued: Story = {
  args: {
    title: "Karma Police",
    artistName: "Radiohead",
    duration: 264,
    trackNumber: 6,
    isQueued: true,
  },
};

export const WithMoreButton: Story = {
  args: {
    title: "Let Down",
    artistName: "Radiohead",
    duration: 299,
    trackNumber: 5,
    onMorePress: () => {},
  },
};

export const FullFeatured: Story = {
  args: {
    title: "No Surprises",
    artistName: "Radiohead",
    duration: 227,
    trackNumber: 10,
    isFavourite: true,
    isDownloaded: true,
    onToggleFavourite: () => {},
    onMorePress: () => {},
  },
};

export const TrackList: Story = {
  render: () => (
    <View>
      <TrackRow
        title="Airbag"
        artistName="Radiohead"
        duration={264}
        trackNumber={1}
        onPress={() => {}}
      />
      <TrackRow
        title="Paranoid Android"
        artistName="Radiohead"
        duration={383}
        trackNumber={2}
        onPress={() => {}}
      />
      <TrackRow
        title="Subterranean Homesick Alien"
        artistName="Radiohead"
        duration={265}
        trackNumber={3}
        isPlaying
        onPress={() => {}}
      />
      <TrackRow
        title="Exit Music (For a Film)"
        artistName="Radiohead"
        duration={264}
        trackNumber={4}
        onPress={() => {}}
      />
      <TrackRow
        title="Let Down"
        artistName="Radiohead"
        duration={299}
        trackNumber={5}
        isFavourite
        onPress={() => {}}
        onToggleFavourite={() => {}}
        onMorePress={() => {}}
      />
    </View>
  ),
};
