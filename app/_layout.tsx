import "../global.css";

import { useEffect } from "react";
import "react-native";

import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

import { useService } from "@/src/hooks/service/service";
import { DownloadService } from "@/src/services/downloads/downloads";
import { NowPlayingService } from "@/src/services/now-playing/now-playing.service";
import { OutputsService } from "@/src/services/outputs/outputs.service";
import { ProgressService } from "@/src/services/progress/progress";
import { registerOpfsServiceWorker } from "@/src/services/filesystem/filesystem.register-sw";

import { PlayerOverlay } from "@/src/components/playback/player-overlay";
import { ServicesProvider } from "@/src/components/services-provider";
import { TrackActionsProvider } from "@/src/components/library/track-actions";

import { fermataTheme } from "@/src/shared/theme/theme";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ServicesProvider>
    <ServiceInitializer />
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

function ServiceInitializer() {
  const downloadService = useService(DownloadService);
  const nowPlayingService = useService(NowPlayingService);
  const outputsService = useService(OutputsService);
  const progressService = useService(ProgressService);

  useEffect(() => {
    nowPlayingService.initialize();
    progressService.initialize();
    void Promise.all([
      registerOpfsServiceWorker(),
      downloadService.initialize(),
      outputsService.initialize(),
    ]).then(() => {
      downloadService.processQueue();
      void SplashScreen.hideAsync();
    });
  }, [downloadService, nowPlayingService, outputsService, progressService]);

  return null;
}
