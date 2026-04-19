import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        amber: {
          light: "#FAEEDA",
          mid: "#EF9F27",
          DEFAULT: "#BA7517",
          dark: "#854F0B",
        },
        fleet: {
          bg: "#0f1117",
          surface: "#1a1d27",
          card: "#21253a",
          border: "#2e3352",
          muted: "#6b7280",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
