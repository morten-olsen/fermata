import type { PropsWithChildren } from "react";
import type { PressableProps } from "react-native";
import { Pressable } from "react-native";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };

interface PressableScaleProps extends PressableProps {
  scaleValue?: number;
}

export function PressableScale({
  children,
  scaleValue = 0.96,
  onPressIn,
  onPressOut,
  style,
  ...props
}: PropsWithChildren<PressableScaleProps>) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }), [scale]);

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        scale.value = withSpring(scaleValue, SPRING_CONFIG);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING_CONFIG);
        onPressOut?.(e);
      }}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
