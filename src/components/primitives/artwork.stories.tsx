import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { Ionicons } from "@expo/vector-icons";

import { Artwork } from "./artwork";

const meta: Meta<typeof Artwork> = {
  title: "primitives/Artwork",
  component: Artwork,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, alignItems: "flex-start" }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Artwork>;

export const SquareSmall: Story = {
  args: {
    uri: "https://picsum.photos/seed/album1/200",
    size: "sm",
  },
};

export const SquareMedium: Story = {
  args: {
    uri: "https://picsum.photos/seed/album2/200",
    size: "md",
  },
};

export const SquareLarge: Story = {
  args: {
    uri: "https://picsum.photos/seed/album3/400",
    size: "lg",
  },
};

export const SquareXL: Story = {
  args: {
    uri: "https://picsum.photos/seed/album4/400",
    size: "xl",
    heroTransition: true,
  },
};

export const Portrait: Story = {
  args: {
    uri: "https://picsum.photos/seed/book1/300/400",
    aspect: "portrait",
    size: "lg",
    fallbackIcon: "book",
  },
};

export const NoArtwork: Story = {
  args: {
    uri: null,
    size: "lg",
  },
};

export const NoArtworkPortrait: Story = {
  args: {
    uri: null,
    aspect: "portrait",
    size: "lg",
    fallbackIcon: "book",
  },
};

export const WithBadge: Story = {
  args: {
    uri: "https://picsum.photos/seed/album5/200",
    size: "md",
    badge: (
      <View
        style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          borderRadius: 10,
          padding: 3,
        }}
      >
        <Ionicons name="cloud-done" size={12} color="#D4A0FF" />
      </View>
    ),
  },
};

export const AllSizes: Story = {
  render: () => (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16 }}>
      <Artwork uri="https://picsum.photos/seed/s1/200" size="sm" />
      <Artwork uri="https://picsum.photos/seed/s2/200" size="md" />
      <Artwork uri="https://picsum.photos/seed/s3/400" size="lg" />
      <Artwork uri="https://picsum.photos/seed/s4/400" size="xl" />
    </View>
  ),
};

export const SquareVsPortrait: Story = {
  render: () => (
    <View style={{ flexDirection: "row", gap: 24 }}>
      <Artwork uri="https://picsum.photos/seed/sq/400" size="lg" aspect="square" />
      <Artwork uri="https://picsum.photos/seed/pt/300/400" size="lg" aspect="portrait" fallbackIcon="book" />
    </View>
  ),
};
