import { View, Text } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { HorizontalList } from "./horizontal-list";

const ITEMS = [
  { id: "1", title: "Morning Jazz", color: "#2D4A3E" },
  { id: "2", title: "Evening Chill", color: "#3E2D4A" },
  { id: "3", title: "Focus Flow", color: "#4A3E2D" },
  { id: "4", title: "Road Trip", color: "#2D3E4A" },
  { id: "5", title: "Night Vibes", color: "#4A2D3E" },
];

const meta: Meta<typeof HorizontalList> = {
  title: "layout/HorizontalList",
  component: HorizontalList,
  decorators: [
    (Story) => (
      <View style={{ width: "100%", maxWidth: 420 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof HorizontalList>;

export const Default: Story = {
  render: () => (
    <HorizontalList
      data={ITEMS}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <View
          style={{
            aspectRatio: 1,
            backgroundColor: item.color,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#E8E8ED", fontSize: 12, fontWeight: "500" }}>
            {item.title}
          </Text>
        </View>
      )}
    />
  ),
};

export const WideItems: Story = {
  render: () => (
    <HorizontalList
      data={ITEMS}
      keyExtractor={(item) => item.id}
      itemWidth={180}
      renderItem={(item) => (
        <View
          style={{
            height: 100,
            backgroundColor: item.color,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#E8E8ED", fontSize: 12, fontWeight: "500" }}>
            {item.title}
          </Text>
        </View>
      )}
    />
  ),
};
