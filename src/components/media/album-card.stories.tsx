import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { AlbumCard } from "./album-card";

const meta: Meta<typeof AlbumCard> = {
  title: "library/AlbumCard",
  component: AlbumCard,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: 200 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    onPress: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof AlbumCard>;

export const WithArtwork: Story = {
  args: {
    id: "album-1",
    title: "OK Computer",
    artistName: "Radiohead",
    year: 1997,
    sourceId: "source-1",
    artworkSourceItemId: "ok-computer-art",
  },
};

export const WithoutArtwork: Story = {
  args: {
    id: "album-2",
    title: "Kid A",
    artistName: "Radiohead",
    year: 2000,
    sourceId: "source-1",
    artworkSourceItemId: null,
  },
};

export const Downloaded: Story = {
  args: {
    id: "album-3",
    title: "In Rainbows",
    artistName: "Radiohead",
    year: 2007,
    sourceId: "source-1",
    artworkSourceItemId: "in-rainbows-art",
    isDownloaded: true,
  },
};

export const LongTitle: Story = {
  args: {
    id: "album-4",
    title: "A Moon Shaped Pool (Special Edition Remastered)",
    artistName: "Radiohead",
    year: 2016,
    sourceId: "source-1",
    artworkSourceItemId: "moon-shaped-art",
  },
};

export const Grid: Story = {
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: "100%", maxWidth: 420 }}>
        <Story />
      </View>
    ),
  ],
  render: () => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {[
        { id: "1", title: "OK Computer", artist: "Radiohead", year: 1997, art: "ok-computer" },
        { id: "2", title: "Kid A", artist: "Radiohead", year: 2000, art: "kid-a" },
        { id: "3", title: "In Rainbows", artist: "Radiohead", year: 2007, art: "in-rainbows" },
        { id: "4", title: "A Moon Shaped Pool", artist: "Radiohead", year: 2016, art: null },
      ].map((album) => (
        <View key={album.id} style={{ width: 170 }}>
          <AlbumCard
            id={album.id}
            title={album.title}
            artistName={album.artist}
            year={album.year}
            sourceId="source-1"
            artworkSourceItemId={album.art}
            onPress={() => {}}
          />
        </View>
      ))}
    </View>
  ),
};
