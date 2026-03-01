/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ADHD urgency colors matching the web app
        urgent: { DEFAULT: "#DC2626", dark: "#991B1B" },
        soon: "#FB923C",
        week: "#FCD34D",
      },
    },
  },
  plugins: [],
};
