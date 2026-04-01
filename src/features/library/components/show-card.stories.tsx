import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { ShowCard } from "./show-card";

const meta: Meta<typeof ShowCard> = {
  title: "library/ShowCard",
  component: ShowCard,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: 160 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    onPress: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof ShowCard>;

export const Default: Story = {
  args: {
    id: "show-1",
    title: "Hardcore History",
    artistName: "Dan Carlin",
    episodeCount: 72,
    sourceId: "source-1",
    artworkSourceItemId: "hh-art",
  },
};

export const WithNewIndicator: Story = {
  args: {
    id: "show-2",
    title: "Serial",
    artistName: "Sarah Koenig",
    episodeCount: 24,
    sourceId: "source-1",
    artworkSourceItemId: "serial-art",
    hasNew: true,
  },
};

export const NoArtwork: Story = {
  args: {
    id: "show-3",
    title: "99% Invisible",
    artistName: "Roman Mars",
    episodeCount: 540,
    sourceId: "source-1",
    artworkSourceItemId: null,
  },
};

export const NoEpisodeCount: Story = {
  args: {
    id: "show-4",
    title: "The Daily",
    artistName: "The New York Times",
    sourceId: "source-1",
    artworkSourceItemId: "daily-art",
  },
};

export const ShowGrid: Story = {
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
        { id: "1", title: "Hardcore History", artist: "Dan Carlin", eps: 72, art: "hh" },
        { id: "2", title: "Serial", artist: "Sarah Koenig", eps: 24, art: "serial", hasNew: true },
        { id: "3", title: "99% Invisible", artist: "Roman Mars", eps: 540, art: null },
        { id: "4", title: "Radiolab", artist: "WNYC", eps: 320, art: "radiolab" },
      ].map((show) => (
        <View key={show.id} style={{ width: 140 }}>
          <ShowCard
            id={show.id}
            title={show.title}
            artistName={show.artist}
            episodeCount={show.eps}
            sourceId="source-1"
            artworkSourceItemId={show.art}
            hasNew={show.hasNew}
            onPress={() => {}}
          />
        </View>
      ))}
    </View>
  ),
};
