import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0B1F40",
        "navy-deep": "#071530",
        gray: {
          DEFAULT: "#6B6B6B",
          light: "#EEF0F3",
        },
        background: "#FAFAF8",
        ink: "#1A2233",
        muted: "#5B6472",
        hairline: "#DCE0E6",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
