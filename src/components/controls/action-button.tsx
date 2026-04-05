import { memo } from "react";
import { Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { PressableScale } from "@/src/components/primitives/primitives";

import { colors } from "@/src/shared/theme/theme";

type ActionButtonVariant = "primary" | "secondary";

interface ActionButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** @default "primary" */
  variant?: ActionButtonVariant;
  onPress: () => void;
}

export const ActionButton = memo(function ActionButton({
  label,
  icon,
  variant = "primary",
  onPress,
}: ActionButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <PressableScale
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
        isPrimary ? "bg-fermata-text" : "bg-fermata-elevated"
      }`}
    >
      <Ionicons
        name={icon}
        size={18}
        color={isPrimary ? colors.bg : colors.text}
      />
      <Text
        className={`font-semibold text-base ml-2 ${
          isPrimary ? "text-fermata-bg" : "text-fermata-text"
        }`}
      >
        {label}
      </Text>
    </PressableScale>
  );
});
