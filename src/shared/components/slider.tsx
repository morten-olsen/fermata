import { useRef } from "react";
import { View, PanResponder } from "react-native";

import { colors } from "@/src/shared/theme/theme";

interface SliderProps {
  value: number; // 0–1
  onValueChange: (value: number) => void;
  trackColor?: string;
  fillColor?: string;
}

export function Slider({
  value,
  onValueChange,
  trackColor = colors.surface,
  fillColor = colors.text,
}: SliderProps) {
  const layoutRef = useRef({ x: 0, width: 0 });
  const callbackRef = useRef(onValueChange);
  callbackRef.current = onValueChange;

  const calcValue = (pageX: number) => {
    const { x, width } = layoutRef.current;
    if (width === 0) return value;
    return Math.max(0, Math.min(1, (pageX - x) / width));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) =>
        callbackRef.current(calcValue(e.nativeEvent.pageX)),
      onPanResponderMove: (e) =>
        callbackRef.current(calcValue(e.nativeEvent.pageX)),
    })
  ).current;

  const pct = Math.round(value * 100);

  return (
    <View
      onLayout={(e) => {
        e.target.measureInWindow((x, _y, w) => {
          layoutRef.current = { x, width: w };
        });
      }}
      style={{ height: 44, justifyContent: "center" }}
      {...panResponder.panHandlers}
    >
      <View
        style={{
          height: 4,
          backgroundColor: trackColor,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 4,
            width: `${pct}%`,
            backgroundColor: fillColor,
            borderRadius: 2,
          }}
        />
      </View>
      {/* Thumb */}
      <View
        style={{
          position: "absolute",
          left: `${pct}%`,
          marginLeft: -8,
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: fillColor,
        }}
      />
    </View>
  );
}
