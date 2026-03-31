import { useState } from "react";
import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-webpack5";

import { SegmentedControl } from "./segmented-control";

const meta: Meta<typeof SegmentedControl> = {
  title: "shared/SegmentedControl",
  component: SegmentedControl,
  decorators: [
    (Story) => (
      <View style={{ padding: 16, maxWidth: 400 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof SegmentedControl>;

export const Default: Story = {
  args: {
    segments: ["Albums", "Artists", "Tracks"],
    selectedIndex: 0,
  },
};

export const TwoSegments: Story = {
  args: {
    segments: ["Library", "Downloads"],
    selectedIndex: 1,
  },
};

export const Interactive: Story = {
  render: () => {
    const [selected, setSelected] = useState(0);
    return (
      <SegmentedControl
        segments={["Albums", "Artists", "Mix Tapes"]}
        selectedIndex={selected}
        onSelect={setSelected}
      />
    );
  },
};
