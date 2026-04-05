import { View, Text } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { colors } from "@/src/shared/theme/theme";

import { useBreakpoint, useColumns, useResponsiveValue } from "./responsive";

// ---------------------------------------------------------------------------
// Wrapper components (hooks can't render directly)
// ---------------------------------------------------------------------------

function BreakpointDisplay() {
  const breakpoint = useBreakpoint();

  return (
    <View style={{ alignItems: "center", padding: 32 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 8 }}>
        Current breakpoint
      </Text>
      <Text style={{ color: colors.accent, fontSize: 48, fontWeight: "700" }}>
        {breakpoint}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>
        Resize the window to see changes
      </Text>
    </View>
  );
}

function ColumnDemo() {
  const columns = useColumns({ base: 2, sm: 3, md: 4, lg: 5 });
  const boxColors = ["#D4A0FF", "#A0D4FF", "#FFD4A0", "#A0FFD4", "#FFA0D4"];

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 12 }}>
        Columns: {columns} (base: 2, sm: 3, md: 4, lg: 5)
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {Array.from({ length: columns }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 64,
              borderRadius: 8,
              backgroundColor: boxColors[i % boxColors.length],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.bg, fontWeight: "600", fontSize: 15 }}>
              {i + 1}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ResponsiveValueDemo() {
  const padding = useResponsiveValue({ base: 16, sm: 24, md: 32, lg: 48 });

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 12 }}>
        Padding: {padding}px (base: 16, sm: 24, md: 32, lg: 48)
      </Text>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding,
          borderWidth: 1,
          borderColor: colors.border,
          borderStyle: "dashed",
        }}
      >
        <Text style={{ color: colors.text, fontSize: 15 }}>
          Content with {padding}px padding
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: "layout/Responsive",
};
export default meta;

type Story = StoryObj;

export const Breakpoint: Story = {
  render: () => <BreakpointDisplay />,
};

export const Columns: Story = {
  render: () => <ColumnDemo />,
};

export const ResponsiveValue: Story = {
  render: () => <ResponsiveValueDemo />,
};

export const All: Story = {
  render: () => (
    <View style={{ gap: 24 }}>
      <BreakpointDisplay />
      <ColumnDemo />
      <ResponsiveValueDemo />
    </View>
  ),
};
