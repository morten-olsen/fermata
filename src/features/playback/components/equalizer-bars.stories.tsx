import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { colors } from "@/src/shared/theme/theme";

import { EqualizerBars } from "./equalizer-bars";

const meta: Meta<typeof EqualizerBars> = {
  title: "playback/EqualizerBars",
  component: EqualizerBars,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: "100%" }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof EqualizerBars>;

export const Default: Story = {
  args: {
    size: 16,
    color: colors.accent,
    barCount: 3,
  },
};

export const Large: Story = {
  args: {
    size: 32,
    color: colors.accent,
    barCount: 3,
  },
};

export const FourBars: Story = {
  args: {
    size: 24,
    color: colors.accent,
    barCount: 4,
  },
};

export const AllSizes: Story = {
  render: () => (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 24 }}>
      <EqualizerBars size={12} />
      <EqualizerBars size={16} />
      <EqualizerBars size={24} />
      <EqualizerBars size={32} />
      <EqualizerBars size={48} />
    </View>
  ),
};
