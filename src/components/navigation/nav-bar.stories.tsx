import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { NavBar, NavBarAction } from "./nav-bar";

const meta: Meta<typeof NavBar> = {
  title: "navigation/NavBar",
  component: NavBar,
  decorators: [
    (Story) => (
      <View style={{ width: "100%", maxWidth: 420 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    onBack: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof NavBar>;

export const BackOnly: Story = {};

export const WithFavourite: Story = {
  render: () => (
    <NavBar onBack={() => {}}>
      <NavBarAction icon="heart-outline" onPress={() => {}} />
    </NavBar>
  ),
};

export const WithFavouriteAndDownload: Story = {
  render: () => (
    <NavBar onBack={() => {}}>
      <NavBarAction icon="heart" color="#D4A0FF" onPress={() => {}} />
      <NavBarAction icon="cloud-download-outline" onPress={() => {}} />
    </NavBar>
  ),
};
