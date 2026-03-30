import { Stack } from "expo-router";
import { colors } from "@/src/theme";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="add-source"
        options={{ presentation: "modal" }}
      />
    </Stack>
  );
}
