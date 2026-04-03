import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { EpisodeRow } from "./episode-row";

const meta: Meta<typeof EpisodeRow> = {
  title: "library/EpisodeRow",
  component: EpisodeRow,
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

type Story = StoryObj<typeof EpisodeRow>;

export const Default: Story = {
  args: {
    title: "Supernova in the East I",
    dateLabel: "Jul 15, 2024",
    duration: 15360,
    episodeNumber: 62,
  },
};

export const NowPlaying: Story = {
  args: {
    title: "Blueprint for Armageddon I",
    dateLabel: "Oct 29, 2023",
    duration: 14400,
    episodeNumber: 50,
    isPlaying: true,
  },
};

export const InProgress: Story = {
  args: {
    title: "Wrath of the Khans I",
    dateLabel: "Apr 8, 2023",
    duration: 5400,
    episodeNumber: 43,
    progress: 0.65,
  },
};

export const Completed: Story = {
  args: {
    title: "Destroyer of Worlds",
    dateLabel: "Aug 5, 2024",
    duration: 21600,
    episodeNumber: 59,
    isCompleted: true,
  },
};

export const Downloaded: Story = {
  args: {
    title: "King of Kings I",
    dateLabel: "Jan 20, 2024",
    duration: 10800,
    episodeNumber: 56,
    isDownloaded: true,
  },
};

export const EpisodeList: Story = {
  render: () => (
    <View>
      <EpisodeRow
        title="Supernova in the East VI"
        dateLabel="Aug 5, 2024"
        duration={15360}
        episodeNumber={67}
        isPlaying
        onPress={() => {}}
      />
      <EpisodeRow
        title="Supernova in the East V"
        dateLabel="Jan 20, 2024"
        duration={14400}
        episodeNumber={66}
        isCompleted
        onPress={() => {}}
      />
      <EpisodeRow
        title="Supernova in the East IV"
        dateLabel="Jul 15, 2023"
        duration={18000}
        episodeNumber={65}
        progress={0.4}
        onPress={() => {}}
      />
      <EpisodeRow
        title="Supernova in the East III"
        dateLabel="Apr 8, 2023"
        duration={16200}
        episodeNumber={64}
        isDownloaded
        onPress={() => {}}
      />
    </View>
  ),
};
