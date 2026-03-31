import { View, Text } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { colors } from "@/src/shared/theme/theme";

import { AlphabetScrubber } from "./alphabet-scrubber";

const FULL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");
const SPARSE = ["A", "B", "D", "F", "K", "M", "R", "S", "T", "#"];

const meta: Meta<typeof AlphabetScrubber> = {
  title: "shared/AlphabetScrubber",
  component: AlphabetScrubber,
  args: {
    onSelect: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof AlphabetScrubber>;

export const FullAlphabet: Story = {
  render: () => (
    <View style={{ height: 540, width: 300, backgroundColor: colors.bg, position: "relative" }}>
      <View style={{ flex: 1, justifyContent: "center", paddingLeft: 16 }}>
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          ← Drag the letter strip on the right
        </Text>
      </View>
      <AlphabetScrubber
        letters={FULL_ALPHABET}
        onSelect={() => {}}
      />
    </View>
  ),
};

export const SparseLetters: Story = {
  render: () => (
    <View style={{ height: 400, width: 300, backgroundColor: colors.bg, position: "relative" }}>
      <View style={{ flex: 1, justifyContent: "center", paddingLeft: 16 }}>
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          Sparse alphabet (only letters with artists)
        </Text>
      </View>
      <AlphabetScrubber
        letters={SPARSE}
        onSelect={() => {}}
      />
    </View>
  ),
};
