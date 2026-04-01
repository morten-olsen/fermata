import { Stack } from "expo-router";

import { colors } from "@/src/shared/theme/theme";

export default function AudiobooksLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="book/[id]" />
    </Stack>
  );
}
