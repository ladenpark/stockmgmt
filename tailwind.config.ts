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
        background: "#FFFFFF",
        "bg-off": "#F8F9FA",
        card: {
          DEFAULT: "#F8F9FA",
          hover: "#F1F3F5",
        },
        border: {
          toss: "#E5E8EB",
          subtle: "#F2F4F6",
        },
        text: {
          main: "#191F28",
          sub: "#8B95A1",
          muted: "#B0B8C1",
        },
        // US Stock Style 상승/하락 컬러 체계
        stock: {
          up: "#22C55E",      // Green (#22C55E) - 상승/수익
          down: "#EF4444",    // Red (#EF4444) - 하락/손실
          upBg: "rgba(34, 197, 94, 0.08)",
          downBg: "rgba(239, 68, 68, 0.08)",
        },
        profit: "#22C55E",
        loss: "#EF4444",
        toss: {
          blue: "#3182F6",
          blueBg: "rgba(49, 130, 246, 0.08)",
          green: "#22C55E",
          red: "#EF4444",
          gray50: "#F9FAFB",
          gray100: "#F2F4F6",
          gray200: "#E5E8EB",
          gray300: "#D1D6DB",
          gray400: "#B0B8C1",
          gray500: "#8B95A1",
          gray600: "#6B7684",
          gray700: "#4E5968",
          gray800: "#333D4B",
          gray900: "#191F28",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
