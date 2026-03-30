import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "SF Mono",
          "Monaco",
          "Inconsolata",
          "Fira Mono",
          "Droid Sans Mono",
          "Source Code Pro",
          "monospace",
        ],
      },
      colors: {
        // Brutalist palette — mostly black/white with one accent
        accent: "#0000ff",
        muted: "#666666",
        border: "#cccccc",
      },
    },
  },
  plugins: [],
};

export default config;
