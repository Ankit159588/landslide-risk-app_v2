/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#0b0f14",
        },
        clay: {
          500: "#c2703d",
          600: "#a75d30",
        },
        moss: {
          500: "#4b7c5a",
          600: "#3a6248",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
