import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { ArtistRow } from "./artist-row";

const meta: Meta<typeof ArtistRow> = {
  title: "library/ArtistRow",
  component: ArtistRow,
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

type Story = StoryObj<typeof ArtistRow>;

export const WithArtwork: Story = {
  args: {
    name: "Radiohead",
    sourceId: "source-1",
    artworkSourceItemId: "radiohead-art",
  },
};

export const WithoutArtwork: Story = {
  args: {
    name: "Thom Yorke",
    sourceId: "source-1",
    artworkSourceItemId: null,
  },
};

export const LongName: Story = {
  args: {
    name: "The Smashing Pumpkins featuring Billy Corgan",
    sourceId: "source-1",
    artworkSourceItemId: "pumpkins-art",
  },
};

export const ArtistList: Story = {
  render: () => (
    <View>
      {[
        { name: "Radiohead", art: "radiohead" },
        { name: "Thom Yorke", art: null },
        { name: "Atoms for Peace", art: "atoms" },
        { name: "The Smile", art: "smile" },
      ].map((artist) => (
        <ArtistRow
          key={artist.name}
          name={artist.name}
          sourceId="source-1"
          artworkSourceItemId={artist.art}
          onPress={() => {}}
        />
      ))}
    </View>
  ),
};
