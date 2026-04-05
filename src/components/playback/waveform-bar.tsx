import { useMemo, useRef } from "react";
import { View, PanResponder } from "react-native";

import { colors } from "@/src/shared/theme/theme";

const BAR_COUNT = 64;
const BAR_GAP = 2;
const BAR_MIN_HEIGHT = 0.08;

interface WaveformBarProps {
  /** 0–1 progress through the track */
  progress: number;
  /** Seed string for generating the waveform shape (e.g. track title + duration) */
  seed: string;
  /** Color for the played portion */
  activeColor: string;
  /** Color for the unplayed portion */
  inactiveColor?: string;
  /** Height of the waveform area */
  height?: number;
  /** Called with 0–1 value when the user seeks */
  onSeek: (value: number) => void;
}

/**
 * A simple seeded PRNG (mulberry32) for deterministic waveform generation.
 * Given the same seed, always produces the same waveform.
 */
function createRng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
  }
  return () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a musically plausible waveform shape.
 * Uses the seed for determinism, then applies smoothing and
 * an envelope (quiet intro, loud middle, fade out) to feel natural.
 */
function generateWaveform(seed: string, count: number): number[] {
  const rng = createRng(seed);
  const raw: number[] = [];

  for (let i = 0; i < count; i++) {
    raw.push(rng());
  }

  // Smooth: average with neighbors for a less jagged shape
  const smoothed = raw.map((v, i) => {
    const prev = raw[i - 1] ?? v;
    const next = raw[i + 1] ?? v;
    return prev * 0.2 + v * 0.6 + next * 0.2;
  });

  // Apply an envelope: gentle rise → sustained middle → fade out
  const envelope = smoothed.map((v, i) => {
    const t = i / (count - 1);
    // Quick rise in first 10%, sustain through 80%, gentle fade in last 10%
    let env = 1;
    if (t < 0.1) env = t / 0.1;
    else if (t > 0.9) env = (1 - t) / 0.1;
    // Add some dynamic variation — occasional louder/quieter sections
    const sectionNoise = 0.7 + 0.3 * Math.sin(t * Math.PI * 4 + rng() * 2);
    return BAR_MIN_HEIGHT + v * env * sectionNoise * (1 - BAR_MIN_HEIGHT);
  });

  return envelope;
}

export function WaveformBar({
  progress,
  seed,
  activeColor,
  inactiveColor = colors.elevated,
  height = 40,
  onSeek,
}: WaveformBarProps) {
  const waveform = useMemo(() => generateWaveform(seed, BAR_COUNT), [seed]);
  const layoutRef = useRef({ x: 0, width: 0 });
  const trackRef = useRef<View>(null);
  const callbackRef = useRef(onSeek);
  callbackRef.current = onSeek;

  const calcValue = (pageX: number) => {
    const { x, width } = layoutRef.current;
    if (width === 0) return progress;
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
        measure();
        callbackRef.current(calcValue(e.nativeEvent.pageX));
      },
      onPanResponderMove: (e) =>
        callbackRef.current(calcValue(e.nativeEvent.pageX)),
    }),
  ).current;

  const activeIndex = Math.floor(progress * BAR_COUNT);

  return (
    <View
      ref={trackRef}
      onLayout={measure}
      style={{
        height: height + 16, // extra touch padding
        justifyContent: "center",
      }}
      {...panResponder.panHandlers}
    >
      <View
        style={{
          height,
          flexDirection: "row",
          alignItems: "center",
          gap: BAR_GAP,
        }}
      >
        {waveform.map((amplitude, i) => {
          const isActive = i <= activeIndex;
          const barHeight = Math.round(amplitude * height);

          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: barHeight,
                borderRadius: 1.5,
                backgroundColor: isActive ? activeColor : inactiveColor,
                opacity: isActive ? 1 : 0.5,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
