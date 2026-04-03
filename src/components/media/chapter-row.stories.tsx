import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { ChapterRow } from "./chapter-row";

const meta: Meta<typeof ChapterRow> = {
  title: "library/ChapterRow",
  component: ChapterRow,
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

type Story = StoryObj<typeof ChapterRow>;

export const Default: Story = {
  args: {
    title: "Chapter 1: The Problem",
    artistName: "Andy Weir",
    duration: 1800,
    chapterNumber: 1,
  },
};

export const NowPlaying: Story = {
  args: {
    title: "Chapter 5: The Solution",
    artistName: "Andy Weir",
    duration: 2400,
    chapterNumber: 5,
    isPlaying: true,
  },
};

export const InProgress: Story = {
  args: {
    title: "Chapter 12: Rendezvous",
    artistName: "Andy Weir",
    duration: 3600,
    chapterNumber: 12,
    progress: 0.45,
  },
};

export const Completed: Story = {
  args: {
    title: "Chapter 3: Survival",
    artistName: "Andy Weir",
    duration: 2100,
    chapterNumber: 3,
    isCompleted: true,
  },
};

export const Downloaded: Story = {
  args: {
    title: "Chapter 8: Contact",
    artistName: "Andy Weir",
    duration: 2700,
    chapterNumber: 8,
    isDownloaded: true,
  },
};

export const ChapterList: Story = {
  render: () => (
    <View>
      <ChapterRow title="Chapter 1: The Problem" artistName="Andy Weir" duration={1800} chapterNumber={1} isCompleted onPress={() => {}} />
      <ChapterRow title="Chapter 2: Stranded" artistName="Andy Weir" duration={2100} chapterNumber={2} isCompleted onPress={() => {}} />
      <ChapterRow title="Chapter 3: Survival" artistName="Andy Weir" duration={2400} chapterNumber={3} progress={0.7} isPlaying onPress={() => {}} />
      <ChapterRow title="Chapter 4: Discovery" artistName="Andy Weir" duration={1950} chapterNumber={4} onPress={() => {}} />
      <ChapterRow title="Chapter 5: The Solution" artistName="Andy Weir" duration={2700} chapterNumber={5} onPress={() => {}} />
    </View>
  ),
};
