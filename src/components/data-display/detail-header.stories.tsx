import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { ActionButton } from "@/src/components/controls/controls";

import { DetailHeader } from "./detail-header";

const meta: Meta<typeof DetailHeader> = {
  title: "data-display/DetailHeader",
  component: DetailHeader,
  decorators: [
    (Story) => (
      <View style={{ width: "100%", maxWidth: 420 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof DetailHeader>;

export const Album: Story = {
  args: {
    artworkUri: "https://picsum.photos/seed/okcomputer/400",
    title: "OK Computer",
    subtitle: "Radiohead",
    onSubtitlePress: () => {},
    meta: "1997 · 12 tracks",
    actions: (
      <>
        <ActionButton label="Play" icon="play" variant="primary" onPress={() => {}} />
        <ActionButton label="Shuffle" icon="shuffle" variant="secondary" onPress={() => {}} />
      </>
    ),
  },
};

export const PodcastShow: Story = {
  args: {
    artworkUri: "https://picsum.photos/seed/podcast1/400",
    fallbackIcon: "mic",
    title: "Hardcore History",
    subtitle: "Dan Carlin",
    meta: "72 episodes",
  },
};

export const Audiobook: Story = {
  args: {
    artworkUri: "https://picsum.photos/seed/book1/300/400",
    artworkAspect: "portrait",
    fallbackIcon: "book",
    title: "Project Hail Mary",
    subtitle: "Andy Weir",
    meta: "24 chapters · 68% complete",
    actions: (
      <ActionButton label="Continue" icon="play" variant="primary" onPress={() => {}} />
    ),
  },
};

export const NoArtwork: Story = {
  args: {
    artworkUri: null,
    title: "Unknown Album",
    subtitle: "Unknown Artist",
    meta: "8 tracks",
    actions: (
      <>
        <ActionButton label="Play" icon="play" variant="primary" onPress={() => {}} />
        <ActionButton label="Shuffle" icon="shuffle" variant="secondary" onPress={() => {}} />
      </>
    ),
  },
};
