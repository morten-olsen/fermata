import { View, Text, Pressable } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { SectionHeader } from "./section-header";

const meta: Meta<typeof SectionHeader> = {
  title: "layout/SectionHeader",
  component: SectionHeader,
  decorators: [
    (Story) => (
      <View style={{ width: "100%", maxWidth: 420 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof SectionHeader>;

export const Default: Story = {
  args: { title: "Recent" },
};

export const WithTrailing: Story = {
  args: {
    title: "Favourites",
    trailing: (
      <Pressable>
        <Text style={{ color: "#D4A0FF", fontSize: 14 }}>See All</Text>
      </Pressable>
    ),
  },
};

export const Multiple: Story = {
  render: () => (
    <View style={{ gap: 24 }}>
      <SectionHeader title="Currently Listening" />
      <SectionHeader title="Favourites" />
      <SectionHeader title="All Audiobooks" />
    </View>
  ),
};
