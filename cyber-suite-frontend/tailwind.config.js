/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#1a1a1a',
          100: '#262626',
          200: '#333333',
          300: '#404040',
          400: '#595959',
          500: '#737373',
          600: '#8c8c8c',
          700: '#a6a6a6',
          800: '#bfbfbf',
          900: '#d9d9d9',
        },
        cyber: {
          primary: '#00ffff',
          secondary: '#ff00ff',
          accent: '#ffff00',
        },
      },
    },
  },
  plugins: [],
}