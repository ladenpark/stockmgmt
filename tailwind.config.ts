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
        // Fintech Design System Tokens
        primary: {
          DEFAULT: "#1366FF",
          hover: "#0D54DB",
          light: "#EBF2FF",
        },
        positive: {
          DEFAULT: "#16A34A",
          light: "#DCFCE7",
        },
        negative: {
          DEFAULT: "#EF4444",
          light: "#FEE2E2",
        },
        neutral: {
          900: "#0F172A", // Text Primary
          800: "#1E293B",
          700: "#334155",
          600: "#475569", // Text Secondary
          500: "#64748B",
          400: "#94A3B8", // Text Muted
          300: "#CBD5E1", // Inactive Border
          200: "#E2E8F0", // Border Default
          100: "#F1F5F9", // Inset / Chip Inactive
          50: "#F8FAFC",  // Background
        },
        surface: "#F8FAFC",
        card: "#FFFFFF",
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
        chip: "10px",
      },
      fontFamily: {
        sans: [
          "'Pretendard'",
          "'Inter'",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        sm: "0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)",
        card: "0 2px 8px -2px rgba(15, 23, 42, 0.05), 0 1px 4px -1px rgba(15, 23, 42, 0.03)",
        modal: "0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
