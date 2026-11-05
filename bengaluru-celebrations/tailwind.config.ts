import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: { DEFAULT: "#FBF7F0", 50: "#FFFDF9", 100: "#FBF7F0", 200: "#F3EADB", 300: "#E8DAC2" },
        plum: { DEFAULT: "#4A1838", 50: "#F7EEF3", 100: "#EBD5E1", 300: "#B77A9C", 500: "#7A2E57", 700: "#4A1838", 800: "#3A122C", 900: "#2A0C20" },
        maroon: { DEFAULT: "#7A1F2E", 600: "#7A1F2E", 700: "#5E1622" },
        gold: { DEFAULT: "#C49A45", 300: "#E4C98C", 500: "#C49A45", 700: "#7D5A17" },
        ink: { DEFAULT: "#2B2228", soft: "#5A4C55" },
        ok: { DEFAULT: "#1E6B47", bg: "#E7F4EC" },
        warn: { DEFAULT: "#8A5A00", bg: "#FDF3DC" },
        bad: { DEFAULT: "#A3222E", bg: "#FBE9EA" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: { card: "0 1px 2px rgba(42,12,32,.06), 0 4px 16px rgba(42,12,32,.06)" },
    },
  },
  plugins: [],
} satisfies Config;
