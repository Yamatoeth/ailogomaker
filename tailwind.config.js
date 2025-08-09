/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2fbff',
          100: '#def4ff',
          200: '#b6e9ff',
          300: '#75d9ff',
          400: '#2cc5ff',
          500: '#00a6e6',
          600: '#0084ba',
          700: '#006a97',
          800: '#06597c',
          900: '#0b4b67'
        }
      }
    }
  },
  plugins: []
};
