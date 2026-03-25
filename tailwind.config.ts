import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#6C5CE7',
          'purple-light': '#A29BFE',
          cyan: '#00D2FF',
          navy: '#1A1A2E',
          'navy-dark': '#0F0F0F',
        },
        purple: {
          400: '#A29BFE',
          500: '#6C5CE7',
        },
        cyan: {
          500: '#00D2FF',
        },
        navy: {
          900: '#1A1A2E',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
