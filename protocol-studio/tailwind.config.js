/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          500: '#6366f1',
          600: '#5046e4',
          700: '#4338ca',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}