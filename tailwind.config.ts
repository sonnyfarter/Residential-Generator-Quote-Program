import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Calm, Apple-like system palette
        ink: "#1c1c1e",
        subtle: "#6e6e73",
        hairline: "#e5e5ea",
        canvas: "#f5f5f7",
        accent: "#0a84ff",
        ok: "#34c759",
        warn: "#ff9f0a",
        bad: "#ff3b30",
      },
      fontFamily: {
        system: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
