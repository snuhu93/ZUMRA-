/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ZUMRA brand palette -- original, not derived from any existing product
        zumra: {
          50: '#EAFBF1',
          100: '#CFF5DF',
          200: '#9EEABF',
          300: '#66DA9C',
          400: '#33C57C',
          500: '#0F9D58', // primary brand green
          600: '#0C7D46',
          700: '#0A6338',
          800: '#084C2C',
          900: '#063620'
        },
        surface: {
          light: '#FFFFFF',
          dark: '#121716'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
