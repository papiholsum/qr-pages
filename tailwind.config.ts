import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50:  "#f7f7f8",
          100: "#ececef",
          200: "#d9d9df",
          400: "#9c9cab",
          600: "#525261",
          800: "#1f1f29",
          900: "#0f0f15",
        },
        accent: {
          DEFAULT: "#5b5bd6",
          hover:   "#4a4ac4",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
