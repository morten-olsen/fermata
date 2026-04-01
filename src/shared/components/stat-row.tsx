import { memo } from "react";
import { View, Text } from "react-native";

interface StatRowProps {
  items: Array<{ label: string; value: number; formatted?: string }>;
}

export const StatRow = memo(function StatRow({ items }: StatRowProps) {
  return (
    <View className="bg-fermata-surface rounded-xl px-4 py-4 mb-2 flex-row justify-between">
      {items.map((item) => (
        <View key={item.label} className="items-center">
          <Text className="text-fermata-text text-lg font-semibold">
            {item.formatted ?? item.value.toLocaleString()}
          </Text>
          <Text className="text-fermata-text-secondary text-xs">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
});
