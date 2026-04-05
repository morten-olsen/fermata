import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { SettingsRow } from "./settings-row";

const meta: Meta<typeof SettingsRow> = {
  title: "data-display/SettingsRow",
  component: SettingsRow,
  decorators: [
    (Story) => (
      <View style={{ padding: 24, width: "100%", maxWidth: 420 }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof SettingsRow>;

export const Default: Story = {
  args: {
    icon: "sync-outline",
    label: "Sync Library",
    onPress: () => {},
  },
};

export const WithDetail: Story = {
  args: {
    icon: "phone-portrait-outline",
    label: "Active Speaker",
    detail: "Living Room",
  },
};

export const Destructive: Story = {
  args: {
    icon: "trash-outline",
    label: "Remove All Downloads",
    onPress: () => {},
    destructive: true,
  },
};

export const SettingsList: Story = {
  render: () => (
    <View>
      <SettingsRow icon="sync-outline" label="Sync Library" onPress={() => {}} />
      <SettingsRow icon="phone-portrait-outline" label="Active Speaker" detail="This Device" />
      <SettingsRow icon="refresh-outline" label="Retry Failed Downloads" onPress={() => {}} />
      <SettingsRow icon="trash-outline" label="Remove All Downloads" onPress={() => {}} destructive />
    </View>
  ),
};
