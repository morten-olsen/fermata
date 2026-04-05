import { useRef, useState } from "react";
import { View, Text, type GestureResponderEvent } from "react-native";

import * as Haptics from "expo-haptics";

import { colors } from "@/src/shared/theme/theme";

interface AlphabetScrubberProps {
  letters: string[];
  onSelect: (letter: string) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}

const LETTER_HEIGHT = 18;
const TOUCH_WIDTH = 36;
const BUBBLE_SIZE = 52;

export function AlphabetScrubber({
  letters,
  onSelect,
  onScrubStart,
  onScrubEnd,
}: AlphabetScrubberProps) {
  const [bubble, setBubble] = useState<{ letter: string; index: number } | null>(null);
  const lastRef = useRef("");
  const currentRef = useRef<string | null>(null);
  const lettersRef = useRef(letters);
  lettersRef.current = letters;

  function letterFromLocationY(locationY: number) {
    const count = lettersRef.current.length;
    if (count === 0) return null;
    const stripHeight = count * LETTER_HEIGHT;
    if (locationY < 0 || locationY > stripHeight) {
      const idx = locationY < 0 ? 0 : count - 1;
      return { letter: lettersRef.current[idx], index: idx };
    }
    const idx = Math.min(Math.floor(locationY / LETTER_HEIGHT), count - 1);
    return { letter: lettersRef.current[idx], index: idx };
  }

  function handleMove(e: GestureResponderEvent) {
    const result = letterFromLocationY(e.nativeEvent.locationY);
    if (!result || result.letter === lastRef.current) return;
    lastRef.current = result.letter;
    currentRef.current = result.letter;
    setBubble(result);
  }

  function handleGrant(e: GestureResponderEvent) {
    onScrubStart?.();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleMove(e);
  }

  function handleEnd() {
    const selected = currentRef.current;
    setBubble(null);
    lastRef.current = "";
    currentRef.current = null;
    onScrubEnd?.();
    if (selected) onSelect(selected);
  }

  if (letters.length === 0) return null;

  const stripHeight = letters.length * LETTER_HEIGHT;

  return (
    <View
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: TOUCH_WIDTH,
        justifyContent: "center",
      }}
      pointerEvents="box-none"
    >
      {/* Floating letter bubble */}
      {bubble && (
        <View
          style={{
            position: "absolute",
            right: TOUCH_WIDTH + 12,
            top: "50%",
            marginTop:
              -stripHeight / 2 +
              bubble.index * LETTER_HEIGHT +
              LETTER_HEIGHT / 2 -
              BUBBLE_SIZE / 2,
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            borderRadius: 12,
            backgroundColor: colors.elevated,
            alignItems: "center",
            justifyContent: "center",
          }}
          pointerEvents="none"
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: colors.accent,
            }}
          >
            {bubble.letter}
          </Text>
        </View>
      )}

      {/* Touch strip */}
      <View
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleGrant}
        onResponderMove={handleMove}
        onResponderRelease={handleEnd}
        onResponderTerminate={handleEnd}
        onResponderTerminationRequest={() => false}
        style={{ width: TOUCH_WIDTH, alignItems: "center" }}
      >
        {letters.map((letter) => (
          <View
            key={letter}
            style={{
              height: LETTER_HEIGHT,
              width: TOUCH_WIDTH,
              alignItems: "center",
              justifyContent: "center",
            }}
            pointerEvents="none"
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: colors.muted,
              }}
            >
              {letter}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
