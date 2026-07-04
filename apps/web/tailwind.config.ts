import type { Config } from "tailwindcss";

const config: Config = {
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
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
