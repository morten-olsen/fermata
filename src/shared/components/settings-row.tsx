import { memo } from "react";
import { Text, Pressable } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/src/shared/theme/theme";

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress?: () => void;
  destructive?: boolean;
}

export const SettingsRow = memo(function SettingsRow({
  icon,
  label,
  detail,
  onPress,
  destructive,
}: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center bg-fermata-surface rounded-xl px-4 py-4 mb-2"
    >
      <Ionicons
        name={icon}
        size={22}
        color={destructive ? colors.destructive : colors.textSecondary}
      />
      <Text
        className={`flex-1 text-base ml-3 ${destructive ? "text-red-400" : "text-fermata-text"}`}
      >
        {label}
      </Text>
      {detail && (
        <Text className="text-fermata-text-secondary text-sm mr-2">
          {detail}
        </Text>
      )}
      {onPress && !destructive && (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      )}
    </Pressable>
  );
});
