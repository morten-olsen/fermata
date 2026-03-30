import { View, Text, Pressable } from "react-native";

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function SegmentedControl({
  segments,
  selectedIndex,
  onSelect,
}: SegmentedControlProps) {
  return (
    <View className="flex-row bg-fermata-surface rounded-xl p-1">
      {segments.map((label, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Pressable
            key={label}
            onPress={() => onSelect(index)}
            className={`flex-1 py-2 rounded-lg items-center ${
              isSelected ? "bg-fermata-elevated" : ""
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                isSelected ? "text-fermata-text" : "text-fermata-muted"
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
