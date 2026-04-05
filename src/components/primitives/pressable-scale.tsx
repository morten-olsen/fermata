import type { PropsWithChildren } from "react";
import { Platform , Pressable } from "react-native";
import type { PressableProps } from "react-native";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };

interface PressableScaleProps extends PressableProps {
  scaleValue?: number;
  className?: string;
}

export function PressableScale({
  children,
  scaleValue = 0.96,
  onPressIn,
  onPressOut,
  className,
  style,
  ...props
}: PropsWithChildren<PressableScaleProps>) {
  // On web, NativeWind className doesn't apply reliably through
  // Animated.createAnimatedComponent. Use a plain Pressable instead.
  if (Platform.OS === "web") {
    return (
      <Pressable className={className} style={style} {...props}>
        {children}
      </Pressable>
    );
  }

  return (
    <PressableScaleNative
      scaleValue={scaleValue}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </PressableScaleNative>
  );
}

/** Native-only animated version — split to avoid hook rules with early return. */
function PressableScaleNative({
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
