import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f4ff",
          100: "#e6e9ff",
          200: "#c7cdff",
          300: "#a3adfd",
          400: "#7c86f6",
          500: "#5b5eea",
          600: "#4640d6",
          700: "#3a34b0",
          800: "#2e2b8a",
          900: "#232065",
          950: "#161447",
        },
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--surface-muted)",
          subtle: "var(--surface-subtle)",
          overlay: "var(--surface-overlay)",
        },
        border: "var(--border)",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        float: "0 8px 24px rgb(15 23 42 / 0.12)",
        modal: "0 24px 48px rgb(15 23 42 / 0.18)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
