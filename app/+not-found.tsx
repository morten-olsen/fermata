import { View, Text } from "react-native";

import { Link, Stack } from "expo-router";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View className="flex-1 bg-fermata-bg items-center justify-center p-5">
        <Text className="text-xl font-bold text-fermata-text">
          This screen doesn't exist.
        </Text>
        <Link href="/(tabs)/library" className="mt-4 py-4">
          <Text className="text-fermata-accent text-base">Go to library</Text>
        </Link>
      </View>
    </>
  );
}
