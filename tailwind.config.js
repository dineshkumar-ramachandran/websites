/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050505',
        coal: '#0d0d0d',
        char: '#161616',
        steel: '#242424',
        lime: { DEFAULT: '#c6ff00', dim: '#9fcc00' },
      },
      fontFamily: {
        display: ['"Anton"', 'Impact', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
