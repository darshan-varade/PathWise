/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light theme colors
        light: {
          bg: "#F9FAFB",
          text: {
            primary: "#1F2937",
            secondary: "#6B7280",
          },
          primary: "#1E3A8A",
          accent: "#38BDF8",
          success: "#10B981",
          error: "#EF4444",
          border: "#E5E7EB",
        },
        // Dark theme colors
        dark: {
          bg: "#0F172A",
          card: "#1E293B",
          text: {
            primary: "#F9FAFB",
            secondary: "#94A3B8",
          },
          primary: "#38BDF8",
          accent: "#10B981",
          error: "#F87171",
          border: "#334155",
          hover: "#60A5FA",
        },
      },
    },
  },
  plugins: [],
};
