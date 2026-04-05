import { View, Text, Pressable } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { colors } from "@/src/shared/theme/theme";

import { BottomSheet } from "./bottom-sheet";

const meta: Meta<typeof BottomSheet> = {
  title: "layout/BottomSheet",
  component: BottomSheet,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <View style={{ height: 500 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof BottomSheet>;

export const Default: Story = {
  render: () => (
    <BottomSheet visible={true} onDismiss={() => {}}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 16 }}>
          Track Actions
        </Text>
        {["Favourite", "Add to Mix Tape", "Go to Album", "Go to Artist"].map((label) => (
          <Pressable key={label} style={{ paddingVertical: 14, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: "500", color: colors.text }}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  ),
};

export const WithCompoundAPI: Story = {
  render: () => (
    <BottomSheet visible={true} onDismiss={() => {}}>
      <BottomSheet.Header title="Track Actions" />
      <BottomSheet.Item icon="heart-outline" label="Favourite" onPress={() => {}} />
      <BottomSheet.Item icon="list-outline" label="Add to Mix Tape" onPress={() => {}} />
      <BottomSheet.Divider />
      <BottomSheet.Item icon="disc-outline" label="Go to Album" onPress={() => {}} />
      <BottomSheet.Item icon="person-outline" label="Go to Artist" onPress={() => {}} />
    </BottomSheet>
  ),
};

export const ActionSheet: Story = {
  render: () => (
    <BottomSheet visible={true} onDismiss={() => {}}>
      <BottomSheet.Header title="Remove Download" />
      <BottomSheet.Item icon="cloud-download-outline" label="Keep on device" onPress={() => {}} />
      <BottomSheet.Divider />
      <BottomSheet.Item icon="trash-outline" label="Remove download" onPress={() => {}} destructive />
    </BottomSheet>
  ),
};
