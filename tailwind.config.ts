import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef9ee',
          100: '#fdf0d3',
          200: '#fadfa5',
          300: '#f7c86e',
          400: '#f4aa39',
          500: '#f19015',
          600: '#e2740b',
          700: '#bc570c',
          800: '#954510',
          900: '#793b11',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
} satisfies Config
