import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { EmptyState } from "./empty-state";

const meta: Meta<typeof EmptyState> = {
  title: "feedback/EmptyState",
  component: EmptyState,
  argTypes: {
    icon: {
      control: "text",
    },
  },
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: "musical-notes-outline",
    title: "No tracks found",
    subtitle: "Add a source to start listening",
  },
};

export const WithoutSubtitle: Story = {
  args: {
    icon: "search-outline",
    title: "No results",
  },
};
