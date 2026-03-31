import { Stack } from "expo-router";

import { colors } from "@/src/shared/theme/theme";

export default function LibraryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="album/[id]" />
      <Stack.Screen name="artist/[name]" />
      <Stack.Screen name="mixtape/[id]" />
    </Stack>
  );
}
