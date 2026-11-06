/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        precobom: {
          blue: '#1A365D',
          red: '#E53E3E',
          gray: '#F3F4F6'
        }
      }
    },
  },
  plugins: [],
}