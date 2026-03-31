import { View, Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/src/shared/theme/theme";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Ionicons name={icon} size={48} color={colors.border} />
      <Text className="text-fermata-muted text-base font-medium mt-4">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-fermata-text-secondary text-sm mt-1 text-center px-8">
          {subtitle}
        </Text>
      )}
    </View>
  );
}
