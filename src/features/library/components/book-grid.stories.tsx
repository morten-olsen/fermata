import { View, Text } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { BookGrid } from "./book-grid";

const MOCK_BOOKS = Array.from({ length: 12 }, (_, i) => ({
  id: `book-${i}`,
  title: [
    "Project Hail Mary", "Dune", "Neuromancer", "The Martian",
    "Foundation", "Snow Crash", "Ender's Game", "Hyperion",
    "Brave New World", "1984", "Fahrenheit 451", "Contact",
  ][i],
  artistName: [
    "Andy Weir", "Frank Herbert", "William Gibson", "Andy Weir",
    "Isaac Asimov", "Neal Stephenson", "Orson Scott Card", "Dan Simmons",
    "Aldous Huxley", "George Orwell", "Ray Bradbury", "Carl Sagan",
  ][i],
  year: 2020 - i,
  sourceId: "source-1",
  sourceItemId: `abs-book-${i}`,
  artworkSourceItemId: null,
  trackCount: 1,
  isFavourite: 0,
  chapters: null,
  mediaType: "audiobook" as const,
  syncedAt: new Date().toISOString(),
}));

const PROGRESS_MAP = new Map([
  ["book-0", 0.68],
  ["book-1", 1],
  ["book-3", 0.25],
  ["book-7", 0.9],
]);

const meta: Meta<typeof BookGrid> = {
  title: "library/BookGrid",
  component: BookGrid,
  decorators: [
    (Story) => (
      <View style={{ height: 600, width: "100%", maxWidth: 420 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof BookGrid>;

export const Default: Story = {
  render: () => (
    <BookGrid
      books={MOCK_BOOKS}
      onBookPress={() => {}}
      progressMap={PROGRESS_MAP}
    />
  ),
};

export const WithHeader: Story = {
  render: () => (
    <BookGrid
      books={MOCK_BOOKS}
      onBookPress={() => {}}
      progressMap={PROGRESS_MAP}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: "#E8E8ED" }}>
            Audiobooks
          </Text>
        </View>
      }
    />
  ),
};
