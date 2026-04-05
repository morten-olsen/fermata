import { View } from "react-native";

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useLibraryStats } from "@/src/hooks/library/library";
import { colors } from "@/src/shared/theme/theme";

export default function TabLayout() {
  const { stats, loading } = useLibraryStats();

  const hasMusic = stats.tracks > 0;
  const hasPodcasts = stats.shows > 0;
  const hasAudiobooks = stats.audiobooks > 0;

  // Wait for stats before rendering tabs so initialRouteName is correct
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  const initialTab = hasMusic
    ? "library"
    : hasPodcasts
      ? "podcasts"
      : hasAudiobooks
        ? "audiobooks"
        : "settings";

  return (
    <Tabs
      initialRouteName={initialTab}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: 85,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="library"
        options={{
          title: "Music",
          href: hasMusic ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-notes" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="podcasts"
        options={{
          title: "Podcasts",
          href: hasPodcasts ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="audiobooks"
        options={{
          title: "Audiobooks",
          href: hasAudiobooks ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
