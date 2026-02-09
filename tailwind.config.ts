import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        light: {
          bg: "#FFFFFF",
          canvas: "#F8FAFC",
          grid: "#CBD5E1",
          primary: "#3B82F6",
          text: "#1E293B",
          sidebar: "#F1F5F9",
          note: "#FFFFFF",
          noteBorder: "#E2E8F0",
        },
        dark: {
          bg: "#0F172A",
          canvas: "#1E293B",
          grid: "#475569",
          primary: "#60A5FA",
          text: "#F1F5F9",
          sidebar: "#1E293B",
          note: "#1E293B",
          noteBorder: "#475569",
        },
      },
      transitionProperty: {
        'colors': 'background-color, border-color, color, fill, stroke',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
