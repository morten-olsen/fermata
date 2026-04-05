import type { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";
const BASE_PATH = process.env.EXPO_PUBLIC_BASE_PATH || "";

const getUniqueIdentifier = () => {
  if (IS_DEV) return "app.fermata.dev";
  return "app.fermata";
};

const getAppName = () => {
  if (IS_DEV) return "Fermata (Dev)";
  return "Fermata";
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: "fermata",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "fermata",
  userInterfaceStyle: "dark",
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0A0A0B",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: getUniqueIdentifier(),
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#0A0A0B",
    },
    package: getUniqueIdentifier(),
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-sqlite",
      {
        enableFTS: true,
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          usesCleartextTraffic: true,
        },
      },
    ],
    ["expo-audio", { enableBackgroundPlayback: true }],
    "./modules/now-playing/app.plugin.js",
    "expo-font",
    "expo-image",
    "expo-web-browser",
  ],
  updates: {
    url: "https://u.expo.dev/abe51b52-d7b4-477d-b64b-27a43d0ec379",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  experiments: {
    typedRoutes: true,
    baseUrl: BASE_PATH,
  },
  extra: {
    router: {},
    eas: {
      projectId: "abe51b52-d7b4-477d-b64b-27a43d0ec379",
    },
  },
});
