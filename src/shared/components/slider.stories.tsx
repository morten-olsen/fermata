import { useState } from "react";
import { View, Text } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { colors } from "@/src/shared/theme/theme";

import { Slider } from "./slider";

const meta: Meta<typeof Slider> = {
  title: "shared/Slider",
  component: Slider,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: "100%", maxWidth: 360 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  args: {
    value: 0.4,
  },
};

export const Empty: Story = {
  args: {
    value: 0,
  },
};

export const Full: Story = {
  args: {
    value: 1,
  },
};

export const AccentFill: Story = {
  args: {
    value: 0.6,
    fillColor: colors.accent,
    trackColor: colors.surface,
  },
};

export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState(0.5);
    return (
      <View>
        <Slider value={value} onValueChange={setValue} />
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8, textAlign: "center" }}>
          {Math.round(value * 100)}%
        </Text>
      </View>
    );
  },
};
