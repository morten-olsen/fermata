/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        fermata: {
          bg: "#0A0A0B",
          surface: "#141416",
          elevated: "#1C1C1F",
          border: "#2A2A2E",
          muted: "#6B6B76",
          text: "#E8E8ED",
          "text-secondary": "#9898A3",
          accent: "#D4A0FF",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
