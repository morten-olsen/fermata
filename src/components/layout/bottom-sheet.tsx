import { memo, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/src/shared/theme/theme";

// ---------------------------------------------------------------------------
// Root (preserves original API — children work as before)
// ---------------------------------------------------------------------------

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
}

function BottomSheetRoot({ visible, onDismiss, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          damping: 28,
          stiffness: 340,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={{ flex: 1 }}>
        {/* Overlay */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            opacity: fadeAnim,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={dismiss} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: insets.bottom + 8,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [600, 0],
                }),
              },
            ],
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              alignItems: "center",
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
              }}
            />
          </View>

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

interface BottomSheetHeaderProps {
  title: string;
}

const BottomSheetHeader = memo(function BottomSheetHeader({ title }: BottomSheetHeaderProps) {
  return (
    <View className="px-4 pb-3">
      <Text className="text-fermata-text text-lg font-semibold">{title}</Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------

interface BottomSheetItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

const BottomSheetItem = memo(function BottomSheetItem({
  icon,
  label,
  onPress,
  destructive,
}: BottomSheetItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3"
    >
      <Ionicons
        name={icon}
        size={20}
        color={destructive ? colors.destructive : colors.textSecondary}
      />
      <Text
        className={`text-base ml-3 ${destructive ? "text-red-400" : "text-fermata-text"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

const BottomSheetDivider = memo(function BottomSheetDivider() {
  return <View className="h-px bg-fermata-border mx-4 my-1" />;
});

// ---------------------------------------------------------------------------
// Compound export
// ---------------------------------------------------------------------------

export const BottomSheet = Object.assign(BottomSheetRoot, {
  Header: BottomSheetHeader,
  Item: BottomSheetItem,
  Divider: BottomSheetDivider,
});
