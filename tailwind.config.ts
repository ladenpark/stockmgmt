import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#094cb2",
        "primary-container": "#3366cc",
        "primary-fixed": "#d9e2ff",
        "on-primary": "#ffffff",
        "on-primary-container": "#e7ebff",
        secondary: "#5a5f63",
        "secondary-container": "#dfe3e8",
        "on-secondary": "#ffffff",
        surface: "#faf9fa",
        "surface-dim": "#dbdadb",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f5f3f4",
        "surface-container": "#efedee",
        "surface-container-high": "#e9e8e9",
        "surface-container-highest": "#e3e2e3",
        "on-surface": "#1b1c1d",
        "on-surface-variant": "#434653",
        outline: "#737784",
        "outline-variant": "#c3c6d5",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        tertiary: "#6d5e00",
        "tertiary-container": "#bfab49",
        "on-tertiary": "#ffffff",
      },
      fontFamily: {
        headline: ["'Noto Serif KR'", "'Noto Serif'", "serif"],
        display: ["'Noto Serif KR'", "'Noto Serif'", "serif"],
        body: ["'Pretendard'", "'Noto Sans KR'", "'Inter'", "sans-serif"],
        label: ["'Public Sans'", "'Noto Sans KR'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
