import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Brand palette built around the site's plum/mauve colors
        // (#E8E2EE / #B89AA8 / #8D6E8D / #482444), interpolated into a
        // full 50-900 ramp so every shade stays in the same family.
        brand: {
          50: "#f7f4f8",
          100: "#e8e2ee",
          200: "#d0bfcc",
          300: "#b89aa8",
          400: "#a2849b",
          500: "#8d6e8d",
          600: "#7c5c7b",
          700: "#6b4969",
          800: "#593756",
          900: "#482444",
        },
        // Neutral scale re-tinted toward the brand hue instead of default
        // cool grays, so text/borders/backgrounds read as one family with
        // the brand color rather than clashing with it.
        gray: {
          50: "#f8f6f9",
          100: "#f1eef4",
          200: "#e6e1ea",
          300: "#d8d0dc",
          400: "#b3a7b8",
          500: "#7d7284",
          600: "#63586a",
          700: "#4a4250",
          800: "#362f3b",
          900: "#241f28",
        },
      },
      // Every existing `shadow` / `shadow-md` / etc. class picks these up
      // automatically -- swaps the default neutral-black shadow for one
      // tinted with the brand color, so cards/menus/dropdowns read as part
      // of the same palette instead of generic and flat.
      boxShadow: {
        sm: "0 1px 2px 0 rgb(72 36 68 / 0.06)",
        DEFAULT: "0 1px 3px 0 rgb(72 36 68 / 0.12), 0 1px 2px -1px rgb(72 36 68 / 0.12)",
        md: "0 4px 6px -1px rgb(72 36 68 / 0.12), 0 2px 4px -2px rgb(72 36 68 / 0.1)",
        lg: "0 10px 15px -3px rgb(72 36 68 / 0.12), 0 4px 6px -4px rgb(72 36 68 / 0.1)",
        xl: "0 20px 25px -5px rgb(72 36 68 / 0.14), 0 8px 10px -6px rgb(72 36 68 / 0.1)",
      },
    },
  },
  plugins: [],
};
export default config;
