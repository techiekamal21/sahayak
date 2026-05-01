/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#070709',
        surface: 'rgba(255, 255, 255, 0.03)',
        surfaceHighlight: 'rgba(255, 255, 255, 0.06)',
        border: 'rgba(255, 255, 255, 0.08)',
        primary: '#6366f1',
        neon: '#2dd4bf',
        danger: '#fb7185',
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundOpacity: ['hover', 'focus'],
    },
  },
  plugins: [],
}
