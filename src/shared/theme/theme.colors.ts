export const colors = {
  bg: "#0A0A0B",
  surface: "#141416",
  elevated: "#1C1C1F",
  border: "#2A2A2E",
  muted: "#6B6B76",
  text: "#E8E8ED",
  textSecondary: "#9898A3",
  accent: "#D4A0FF",
  destructive: "#FF6B6B",
  transparent: "transparent",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export type ColorName = keyof typeof colors;
