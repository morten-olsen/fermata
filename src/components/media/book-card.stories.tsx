import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { BookCard } from "./book-card";

const meta: Meta<typeof BookCard> = {
  title: "library/BookCard",
  component: BookCard,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: 130 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    onPress: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof BookCard>;

export const Default: Story = {
  args: {
    id: "book-1",
    title: "Project Hail Mary",
    artistName: "Andy Weir",
    sourceId: "source-1",
    artworkSourceItemId: "phm-art",
  },
};

export const InProgress: Story = {
  args: {
    id: "book-2",
    title: "The Martian",
    artistName: "Andy Weir",
    sourceId: "source-1",
    artworkSourceItemId: "martian-art",
    progress: 0.68,
  },
};

export const Downloaded: Story = {
  args: {
    id: "book-3",
    title: "Dune",
    artistName: "Frank Herbert",
    sourceId: "source-1",
    artworkSourceItemId: "dune-art",
    isDownloaded: true,
  },
};

export const NoArtwork: Story = {
  args: {
    id: "book-4",
    title: "Neuromancer",
    artistName: "William Gibson",
    sourceId: "source-1",
    artworkSourceItemId: null,
  },
};

export const BookShelf: Story = {
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
        { id: "1", title: "Project Hail Mary", artist: "Andy Weir", art: "phm", progress: 0.68 },
        { id: "2", title: "Dune", artist: "Frank Herbert", art: "dune", progress: 1 },
        { id: "3", title: "Neuromancer", artist: "William Gibson", art: null },
        { id: "4", title: "The Martian", artist: "Andy Weir", art: "martian", progress: 0.25 },
        { id: "5", title: "Foundation", artist: "Isaac Asimov", art: "foundation" },
        { id: "6", title: "Snow Crash", artist: "Neal Stephenson", art: "snow" },
      ].map((book) => (
        <View key={book.id} style={{ width: 110 }}>
          <BookCard
            id={book.id}
            title={book.title}
            artistName={book.artist}
            sourceId="source-1"
            artworkSourceItemId={book.art}
            progress={book.progress}
            onPress={() => {}}
          />
        </View>
      ))}
    </View>
  ),
};
