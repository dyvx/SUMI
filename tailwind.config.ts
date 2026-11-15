import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#08080b",
          800: "#0c0c11",
          700: "#12121a",
          600: "#1a1a24",
        },
        violet: { glow: "#8b5cf6" },
        crimson: { glow: "#e11d48" },
      },
      fontFamily: {
        display: ['"SF Pro Display"', "-apple-system", "BlinkMacSystemFont", "Inter", "system-ui", "sans-serif"],
        serif: ['"New York"', "Iowan Old Style", "Georgia", "serif"],
      },
      borderRadius: { glass: "22px" },
      backdropBlur: { glass: "28px" },
    },
  },
  plugins: [],
};

export default config;
