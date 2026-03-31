import { useState } from "react";
import { View, Text, Pressable } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { colors } from "@/src/shared/theme/theme";

import { BottomSheet } from "./bottom-sheet";

const meta: Meta<typeof BottomSheet> = {
  title: "shared/BottomSheet",
  component: BottomSheet,
  parameters: {
    layout: "fullscreen",
  },
};
export default meta;

type Story = StoryObj<typeof BottomSheet>;

export const Default: Story = {
  render: () => {
    const [visible, setVisible] = useState(false);
    return (
      <View style={{ padding: 24 }}>
        <Pressable
          onPress={() => setVisible(true)}
          style={{
            backgroundColor: colors.text,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.bg, fontWeight: "600" }}>Open Sheet</Text>
        </Pressable>
        <BottomSheet visible={visible} onDismiss={() => setVisible(false)}>
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
      </View>
    );
  },
};

export const WithScrollableContent: Story = {
  render: () => {
    const [visible, setVisible] = useState(false);
    return (
      <View style={{ padding: 24 }}>
        <Pressable
          onPress={() => setVisible(true)}
          style={{
            backgroundColor: colors.elevated,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Open Queue Sheet</Text>
        </Pressable>
        <BottomSheet visible={visible} onDismiss={() => setVisible(false)}>
          <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 16 }}>
              Queue
            </Text>
            {Array.from({ length: 8 }, (_, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 13, width: 28 }}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "500" }}>
                    Track {i + 1}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Artist Name</Text>
                </View>
                <Text style={{ color: colors.muted, fontSize: 13 }}>3:42</Text>
              </View>
            ))}
          </View>
        </BottomSheet>
      </View>
    );
  },
};
