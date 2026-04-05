import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { ProgressBar } from "./progress-bar";

const meta: Meta<typeof ProgressBar> = {
  title: "feedback/ProgressBar",
  component: ProgressBar,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: "100%", maxWidth: 400 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ProgressBar>;

export const Empty: Story = { args: { value: 0 } };
export const Quarter: Story = { args: { value: 0.25 } };
export const Half: Story = { args: { value: 0.5 } };
export const ThreeQuarters: Story = { args: { value: 0.75 } };
export const Full: Story = { args: { value: 1 } };

export const CustomColor: Story = {
  args: {
    value: 0.6,
    fillColor: "#4CAF50",
    height: 3,
  },
};

export const AllStates: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      <ProgressBar value={0} />
      <ProgressBar value={0.25} />
      <ProgressBar value={0.5} />
      <ProgressBar value={0.75} />
      <ProgressBar value={1} />
    </View>
  ),
};
