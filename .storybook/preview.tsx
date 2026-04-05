import React from "react";
import type { Preview } from "@storybook/react-native-web-vite";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { fermataTheme } from "./fermata-theme";

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: [
          "Fermata",
          "Getting Started",
          "Design Tokens",
          "primitives",
          "controls",
          "feedback",
          "layout",
          "navigation",
          "data-display",
          "playback",
          "library",
        ],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "fermata",
      values: [
        { name: "fermata", value: "#0A0A0B" },
        { name: "surface", value: "#141416" },
        { name: "light", value: "#ffffff" },
      ],
    },
    docs: {
      theme: fermataTheme,
    },
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <SafeAreaProvider>
        <div
          style={{
            backgroundColor: "#0A0A0B",
            padding: 24,
            width: "100%",
          }}
        >
          <Story />
        </div>
      </SafeAreaProvider>
    ),
  ],
};

export default preview;
