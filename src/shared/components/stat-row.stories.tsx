import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { StatRow } from "./stat-row";

const meta: Meta<typeof StatRow> = {
  title: "shared/StatRow",
  component: StatRow,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: "100%", maxWidth: 420 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof StatRow>;

export const LibraryStats: Story = {
  args: {
    items: [
      { label: "Artists", value: 142 },
      { label: "Albums", value: 387 },
      { label: "Tracks", value: 4821 },
      { label: "Playlists", value: 12 },
    ],
  },
};

export const DownloadStats: Story = {
  args: {
    items: [
      { label: "Downloaded", value: 256 },
      { label: "Pending", value: 3 },
      { label: "Failed", value: 0 },
      { label: "Storage", value: 0, formatted: "2.4 GB" },
    ],
  },
};
