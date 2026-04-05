import { memo } from "react";
import { View } from "react-native";

import { colors } from "@/src/shared/theme/theme";

interface ProgressBarProps {
  /** Progress value between 0 and 1. */
  value: number;
  /** @default colors.accent */
  fillColor?: string;
  /** @default colors.border */
  trackColor?: string;
  /** @default 2 */
  height?: number;
}

export const ProgressBar = memo(function ProgressBar({
  value,
  fillColor = colors.accent,
  trackColor = colors.border,
  height = 2,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 1);

  return (
    <View
      style={{
        height,
        backgroundColor: trackColor,
        borderRadius: height / 2,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height,
          backgroundColor: fillColor,
          borderRadius: height / 2,
          width: `${Math.round(clamped * 100)}%`,
        }}
      />
    </View>
  );
});
