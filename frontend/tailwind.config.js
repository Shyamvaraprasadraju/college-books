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
          DEFAULT: '#0071e3', // Apple Blue
          dark: '#005fbc',
          light: '#47a6ff',
          50: '#f2f8fd',
          100: '#e5f1fc',
          200: '#c5e2f9',
          300: '#94c9f5',
          400: '#5baaf0',
          500: '#2f8be6',
          600: '#0071e3', // Apple Blue
          700: '#005fbc',
          800: '#00529d',
          900: '#06457f',
        },
        secondary: {
          DEFAULT: '#64748b', // Slate 500
        },
        surface: {
          DEFAULT: '#ffffff',
          glass: 'rgba(255, 255, 255, 0.7)',
        },
        background: '#f5f5f7', // Apple Light Gray background
        dark: {
          DEFAULT: '#1d1d1f', // Apple Dark
          lighter: '#323232',
        }
      },
      fontFamily: {
        sans: ['"SF Pro Display"', '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'], // Prioritize SF Pro
        heading: ['"SF Pro Display"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'float': '0 10px 40px -10px rgba(0,0,0,0.08)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
