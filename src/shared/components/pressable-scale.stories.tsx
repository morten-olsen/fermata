import { View, Text } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { colors } from "@/src/shared/theme/theme";

import { PressableScale } from "./pressable-scale";

const meta: Meta<typeof PressableScale> = {
  title: "shared/PressableScale",
  component: PressableScale,
  decorators: [
    (Story) => (
      <View style={{ padding: 24 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof PressableScale>;

export const Default: Story = {
  render: (args) => (
    <PressableScale {...args} onPress={() => {}}>
      <View
        style={{
          backgroundColor: colors.surface,
          padding: 16,
          borderRadius: 12,
          width: 200,
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "500" }}>Press me</Text>
      </View>
    </PressableScale>
  ),
};

export const SubtleScale: Story = {
  render: () => (
    <PressableScale scaleValue={0.98} onPress={() => {}}>
      <View
        style={{
          backgroundColor: colors.surface,
          padding: 16,
          borderRadius: 12,
          flexDirection: "row",
          alignItems: "center",
          width: 280,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.elevated,
            marginRight: 12,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "500" }}>Artist Name</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Subtle scale (0.98)</Text>
        </View>
      </View>
    </PressableScale>
  ),
};

export const CardScale: Story = {
  render: () => (
    <PressableScale scaleValue={0.96} onPress={() => {}}>
      <View style={{ width: 160 }}>
        <View
          style={{
            aspectRatio: 1,
            backgroundColor: colors.surface,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 32 }}>🎵</Text>
        </View>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>Album Title</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Artist · 2024</Text>
      </View>
    </PressableScale>
  ),
};
