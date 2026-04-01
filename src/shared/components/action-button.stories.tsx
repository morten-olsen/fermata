import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { ActionButton } from "./action-button";

const meta: Meta<typeof ActionButton> = {
  title: "shared/ActionButton",
  component: ActionButton,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: "100%", maxWidth: 200 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    onPress: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof ActionButton>;

export const Play: Story = {
  args: { label: "Play", icon: "play", variant: "primary" },
};

export const Shuffle: Story = {
  args: { label: "Shuffle", icon: "shuffle", variant: "secondary" },
};

export const Continue: Story = {
  args: { label: "Continue", icon: "play", variant: "primary" },
};

export const PlayAndShuffle: Story = {
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: "100%", maxWidth: 400 }}>
        <Story />
      </View>
    ),
  ],
  render: () => (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <ActionButton label="Play" icon="play" variant="primary" onPress={() => {}} />
      <ActionButton label="Shuffle" icon="shuffle" variant="secondary" onPress={() => {}} />
    </View>
  ),
};
