import { memo } from "react";
import type { ReactNode } from "react";
import { View, Text } from "react-native";

interface SectionHeaderProps {
  title: string;
  /** Optional trailing element (e.g. "See All" link). */
  trailing?: ReactNode;
}

export const SectionHeader = memo(function SectionHeader({
  title,
  trailing,
}: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 mb-3">
      <Text className="text-lg font-semibold text-fermata-text">{title}</Text>
      {trailing}
    </View>
  );
});
