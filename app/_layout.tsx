import "../global.css";

import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";

import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

import {
  usePlaybackStore,
  setAdapterResolver,
  setOutputResolver,
  setLocalAdapterResolver,
  PlayerOverlay,
} from "@/src/features/playback/playback";
import { useSourcesStore } from "@/src/features/sources/sources";
import { useOutputsStore, setTransferPlaybackCallback } from "@/src/features/outputs/outputs";
import { TrackActionsProvider } from "@/src/features/library/library";
import { ServicesProvider } from "@/src/features/services/services";
import { useService } from "@/src/hooks/service/service";
import { DownloadService } from "@/src/services/downloads/downloads";
import { setDownloadService } from "@/src/features/downloads/downloads";

import migrations from "@/drizzle/migrations";

import { useMigrations } from "@/src/shared/db/db.migrator";
import { db } from "@/src/shared/db/db.client";
import { fermataTheme } from "@/src/shared/theme/theme";

// Register background playback service once (safe if native module missing)
let _playbackServiceRegistered = false;
if (!_playbackServiceRegistered) {
  try {
    const TrackPlayer = require("react-native-track-player").default;
    TrackPlayer.registerPlaybackService(
      // eslint-disable-next-line boundaries/dependencies -- RNTP requires direct module path for service registration
      () => require("@/src/features/playback/playback.service").PlaybackService
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

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const loadSources = useSourcesStore((s) => s.loadSources);
  const initializePlayer = usePlaybackStore((s) => s.initialize);
  const initializeOutputs = useOutputsStore((s) => s.initialize);

  useEffect(() => {
    if (success) {
      void Promise.all([
        loadSources(),
        initializeOutputs(),
      ]).then(() => {
        const getAdapter = (sourceId: string) =>
          useSourcesStore.getState().getAdapter(sourceId);
        setAdapterResolver(getAdapter);
        setOutputResolver(() => useOutputsStore.getState().getActiveAdapter());
        setLocalAdapterResolver(() => useOutputsStore.getState().localAdapter);
        setTransferPlaybackCallback(() =>
          usePlaybackStore.getState().transferPlayback()
        );
        // Initialize playback after outputs are ready
        void initializePlayer();
        void SplashScreen.hideAsync();
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
    <ServicesProvider>
    <DownloadInitializer />
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
        </Stack>
        <PlayerOverlay />
      </TrackActionsProvider>
      <StatusBar style="light" />
    </ThemeProvider>
    </ServicesProvider>
  );
}

function DownloadInitializer() {
  const downloadService = useService(DownloadService);

  useEffect(() => {
    setDownloadService(downloadService);
    void downloadService.initialize().then(() => {
      downloadService.processQueue();
    });
  }, [downloadService]);

  return null;
}
