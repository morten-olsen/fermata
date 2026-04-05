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
  const trackRef = useRef<View>(null);
  const callbackRef = useRef(onValueChange);
  callbackRef.current = onValueChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  const calcValue = (pageX: number) => {
    const { x, width } = layoutRef.current;
    if (width === 0) return valueRef.current;
    return Math.max(0, Math.min(1, (pageX - x) / width));
  };

  const measure = () => {
    trackRef.current?.measureInWindow((x, _y, w) => {
      if (w > 0) layoutRef.current = { x, width: w };
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        // Re-measure on every touch — handles animated/scrolled containers
        measure();
        callbackRef.current(calcValue(e.nativeEvent.pageX));
      },
      onPanResponderMove: (e) =>
        callbackRef.current(calcValue(e.nativeEvent.pageX)),
    }),
  ).current;

  const pct = Math.round(value * 100);

  return (
    <View
      ref={trackRef}
      onLayout={measure}
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
