/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#1e1a2e",
        surface: "#2a2440",
        "surface-2": "#352e52",
        primary: {
          DEFAULT: "#b794d4",
          hover: "#c5a5e0",
        },
        secondary: "#f5b3c8",
        accent: "#ffd6a5",
        text: "#f0eaf5",
        "text-muted": "#948aab",
        border: "rgba(183, 148, 212, 0.2)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 30px rgba(183, 148, 212, 0.15)",
      },
    },
  },
  plugins: [],
};
