import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        vgon: {
          DEFAULT: "#2356A5",
          primary: "#2356A5",
          cyan: "#4CC6E5",
          petrol: "#00598B",
          ink: "#0B1B36",
          soft: "#EEF3F9",
          "soft-2": "#F4F7FB",
          border: "#D7E1EE",
          muted: "#6B7A92",
          success: "#10B981",
          danger: "#DC2626",
          warn: "#F59E0B"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ]
      },
      boxShadow: {
        soft: "0 2px 10px 0 rgba(11, 27, 54, 0.06)",
        card: "0 4px 20px -6px rgba(11, 27, 54, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
