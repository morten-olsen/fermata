import type { StorybookConfig } from "@storybook/react-native-web-vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-native-web-vite",
    options: {
      pluginReactOptions: {
        jsxImportSource: "nativewind",
      },
    },
  },
  async viteFinal(config) {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...(config.resolve?.alias ?? {}),
          "react-native-track-player": path.resolve(
            __dirname,
            "mocks/react-native-track-player.ts",
          ),
          "@/src/features/artwork/artwork": path.resolve(
            __dirname,
            "mocks/artwork.ts",
          ),
          "@/src/features/playback/playback": path.resolve(
            __dirname,
            "mocks/playback.ts",
          ),
          "expo-haptics": path.resolve(__dirname, "mocks/expo-haptics.ts"),
        },
      },
    };
  },
};
export default config;
