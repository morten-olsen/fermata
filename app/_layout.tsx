import "../global.css";

import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { fermataTheme } from "@/src/theme";
import { db } from "@/src/db/client";
import migrations from "@/drizzle/migrations";
import { useSourcesStore } from "@/src/stores/sources";
import { usePlaybackStore, setAdapterResolver } from "@/src/stores/playback";
import { useDownloadStore } from "@/src/stores/downloads";
import { setDownloadAdapterResolver } from "@/src/services/download-manager";
import { TrackActionsProvider } from "@/src/components/library/TrackActionSheet";

// Register background playback service once (safe if native module missing)
let _playbackServiceRegistered = false;
if (!_playbackServiceRegistered) {
  try {
    const TrackPlayer = require("react-native-track-player").default;
    TrackPlayer.registerPlaybackService(() =>
      require("@/src/services/playback-service").PlaybackService
    );
    _playbackServiceRegistered = true;
  } catch {
    // Track Player not available (Expo Go) — audio features disabled
  }
}

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const loadSources = useSourcesStore((s) => s.loadSources);
  const initializePlayer = usePlaybackStore((s) => s.initialize);
  const initializeDownloads = useDownloadStore((s) => s.initialize);

  useEffect(() => {
    if (success) {
      Promise.all([loadSources(), initializePlayer(), initializeDownloads()]).then(() => {
        const getAdapter = (sourceId: string) =>
          useSourcesStore.getState().getAdapter(sourceId);
        setAdapterResolver(getAdapter);
        setDownloadAdapterResolver(getAdapter);
        // Resume pending downloads now that adapters are wired
        useDownloadStore.getState().resumeDownloads();
        SplashScreen.hideAsync();
      });
    }
  }, [success]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0A0B", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#E8E8ED", fontSize: 16 }}>
          Database error: {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0A0B", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#D4A0FF" />
      </View>
    );
  }

  return (
    <ThemeProvider value={fermataTheme}>
      <TrackActionsProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: fermataTheme.colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="player"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
        </Stack>
      </TrackActionsProvider>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
