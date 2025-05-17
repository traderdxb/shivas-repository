/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e40af', // Blue
          light: '#3b82f6',
          dark: '#1e3a8a',
        },
        secondary: {
          DEFAULT: '#ef4444', // Red
          light: '#f87171',
          dark: '#b91c1c',
        },
        neutral: {
          DEFAULT: '#f8fafc', // White/Light
          light: '#ffffff',
          dark: '#e2e8f0',
        }
      },
    },
  },
  plugins: [],
};