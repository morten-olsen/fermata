import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { MediaCard } from "./media-card";

const meta: Meta<typeof MediaCard> = {
  title: "data-display/MediaCard",
  component: MediaCard,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, maxWidth: 180 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof MediaCard>;

export const Album: Story = {
  render: () => (
    <View style={{ maxWidth: 180 }}>
      <MediaCard.Album
        title="OK Computer"
        artistName="Radiohead"
        year={1997}
        artworkUri="https://picsum.photos/seed/okcomputer/400"
        onPress={() => {}}
      />
    </View>
  ),
};

export const AlbumDownloaded: Story = {
  render: () => (
    <View style={{ maxWidth: 180 }}>
      <MediaCard.Album
        title="In Rainbows"
        artistName="Radiohead"
        year={2007}
        artworkUri="https://picsum.photos/seed/inrainbows/400"
        isDownloaded
        onPress={() => {}}
      />
    </View>
  ),
};

export const Show: Story = {
  render: () => (
    <View style={{ maxWidth: 180 }}>
      <MediaCard.Show
        title="Hardcore History"
        artistName="Dan Carlin"
        episodeCount={42}
        artworkUri="https://picsum.photos/seed/podcast1/400"
        onPress={() => {}}
      />
    </View>
  ),
};

export const ShowWithNew: Story = {
  render: () => (
    <View style={{ maxWidth: 180 }}>
      <MediaCard.Show
        title="Hardcore History"
        artistName="Dan Carlin"
        episodeCount={42}
        artworkUri="https://picsum.photos/seed/podcast1/400"
        hasNew
        onPress={() => {}}
      />
    </View>
  ),
};

export const Book: Story = {
  render: () => (
    <View style={{ maxWidth: 180 }}>
      <MediaCard.Book
        title="Project Hail Mary"
        artistName="Andy Weir"
        artworkUri="https://picsum.photos/seed/book1/300/400"
        onPress={() => {}}
      />
    </View>
  ),
};

export const BookWithProgress: Story = {
  render: () => (
    <View style={{ maxWidth: 180 }}>
      <MediaCard.Book
        title="Project Hail Mary"
        artistName="Andy Weir"
        artworkUri="https://picsum.photos/seed/book1/300/400"
        progress={0.68}
        onPress={() => {}}
      />
    </View>
  ),
};

export const CustomComposition: Story = {
  render: () => (
    <View style={{ maxWidth: 180 }}>
      <MediaCard onPress={() => {}}>
        <MediaCard.Artwork
          uri="https://picsum.photos/seed/mixtape/400"
          fallbackIcon="musical-notes"
          badge={<MediaCard.CountBadge icon="musical-notes" count={24} />}
        />
        <MediaCard.Title>Late Night Mix</MediaCard.Title>
        <MediaCard.Subtitle>24 tracks</MediaCard.Subtitle>
      </MediaCard>
    </View>
  ),
};
