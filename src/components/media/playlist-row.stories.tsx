import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { PlaylistRow } from "./playlist-row";

const meta: Meta<typeof PlaylistRow> = {
  title: "library/PlaylistRow",
  component: PlaylistRow,
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

type Story = StoryObj<typeof PlaylistRow>;

export const Default: Story = {
  args: {
    name: "Evening Wind Down",
    trackCount: 12,
    sourceId: "source-1",
  },
};

export const Favourite: Story = {
  args: {
    name: "Road Trip Essentials",
    trackCount: 24,
    sourceId: "source-1",
    isFavourite: true,
  },
};

export const LocalPlaylist: Story = {
  args: {
    name: "Workout Mix",
    trackCount: 8,
    sourceId: null,
  },
};

export const SingleTrack: Story = {
  args: {
    name: "Just This One Song",
    trackCount: 1,
    sourceId: "source-1",
  },
};

export const PlaylistList: Story = {
  render: () => (
    <View>
      <PlaylistRow name="Evening Wind Down" trackCount={12} sourceId="s1" onPress={() => {}} />
      <PlaylistRow name="Road Trip" trackCount={24} sourceId="s1" isFavourite onPress={() => {}} />
      <PlaylistRow name="Focus Music" trackCount={8} sourceId={null} onPress={() => {}} />
      <PlaylistRow name="Sunday Morning" trackCount={15} sourceId="s1" onPress={() => {}} />
    </View>
  ),
};
