/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        zotero: {
          bg: '#2d2d2d',
          surface: '#3d3d3d',
          border: '#4a4a4a',
          muted: '#6b6b6b',
          text: '#e0e0e0',
          accent: '#5a7a9a',
        },
      },
    },
  },
  plugins: [],
}
