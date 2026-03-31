import { create } from "storybook/theming/create";

export const fermataTheme = create({
  base: "dark",

  // Brand
  brandTitle: "Fermata",

  // Typography
  fontBase: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontCode:
    '"SF Mono", SFMono-Regular, ui-monospace, Menlo, Consolas, monospace',

  // Palette
  colorPrimary: "#D4A0FF",
  colorSecondary: "#D4A0FF",

  // UI chrome
  appBg: "#0A0A0B",
  appContentBg: "#0A0A0B",
  appPreviewBg: "#0A0A0B",
  appBorderColor: "#2A2A2E",
  appBorderRadius: 12,

  // Text
  textColor: "#E8E8ED",
  textInverseColor: "#0A0A0B",

  // Toolbar
  barTextColor: "#9898A3",
  barSelectedColor: "#D4A0FF",
  barHoverColor: "#E8E8ED",
  barBg: "#141416",

  // Form inputs
  inputBg: "#141416",
  inputBorder: "#2A2A2E",
  inputTextColor: "#E8E8ED",
  inputBorderRadius: 8,

  // Booleans
  booleanBg: "#141416",
  booleanSelectedBg: "#D4A0FF",
});
