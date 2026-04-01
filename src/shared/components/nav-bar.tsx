import { memo, useCallback } from "react";
import type { ReactNode } from "react";
import { View, Pressable } from "react-native";

import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/src/shared/theme/theme";

function defaultBack() {
  router.back();
}

interface NavBarProps {
  /** Right-side actions (icon buttons). */
  children?: ReactNode;
  /** Custom back handler. Defaults to router.back(). */
  onBack?: () => void;
}

export const NavBar = memo(function NavBar({ children, onBack }: NavBarProps) {
  const handleBack = useCallback(() => {
    (onBack ?? defaultBack)();
  }, [onBack]);

  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <Pressable onPress={handleBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <View className="flex-row items-center gap-1">
        {children}
      </View>
    </View>
  );
});

interface NavBarActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
}

export const NavBarAction = memo(function NavBarAction({
  icon,
  color = colors.muted,
  onPress,
}: NavBarActionProps) {
  return (
    <Pressable onPress={onPress} className="p-2">
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
});
