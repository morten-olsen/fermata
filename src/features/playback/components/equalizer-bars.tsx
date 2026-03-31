import { View } from "react-native";
import { useEffect } from "react";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import { colors } from "@/src/shared/theme/theme";

interface EqualizerBarsProps {
  size?: number;
  color?: string;
  barCount?: number;
}

export function EqualizerBars({
  size = 16,
  color = colors.accent,
  barCount = 3,
}: EqualizerBarsProps) {
  const bars = Array.from({ length: barCount }, (_, i) => (
    <Bar key={i} index={i} size={size} color={color} barCount={barCount} />
  ));

  return (
    <View
      style={{
        width: size,
        height: size,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: size * 0.08,
      }}
    >
      {bars}
    </View>
  );
}

function Bar({
  index,
  size,
  color,
  barCount,
}: {
  index: number;
  size: number;
  color: string;
  barCount: number;
}) {
  const height = useSharedValue(0.3);

  useEffect(() => {
    // Each bar gets a different rhythm for organic feel
    const durations = [420, 530, 470];
    const minHeights = [0.2, 0.15, 0.25];
    const maxHeights = [0.85, 1.0, 0.7];

    const duration = durations[index % durations.length];
    const minH = minHeights[index % minHeights.length];
    const maxH = maxHeights[index % maxHeights.length];

    height.value = withDelay(
      index * 120,
      withRepeat(
        withSequence(
          withTiming(maxH, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(minH, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [index, height]);

  const barWidth = (size * 0.7) / barCount;

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value * size,
  }), [height, size]);

  return (
    <Animated.View
      style={[
        {
          width: barWidth,
          borderRadius: barWidth / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}
