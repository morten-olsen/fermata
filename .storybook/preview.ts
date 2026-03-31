import type { Preview } from "@storybook/react-native-web-vite";
import "../global.css";

const preview: Preview = {
  parameters: {
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
        { name: "light", value: "#ffffff" },
      ],
    },
  },
};

export default preview;
