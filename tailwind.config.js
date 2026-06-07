/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dream-bg': '#0a0a0f',
        'dream-dark': '#12121a',
        'dream-primary': '#e94560',
        'dream-secondary': '#533483',
        'dream-accent': '#6b7280',
        'dream-border': '#2a2a3a',
        'dream-error': '#ef4444',
        'dream-success': '#22c55e',
        'dream-warning': '#f59e0b',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'monospace'],
        'body': ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
