/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ios: {
          blue: '#007AFF',
          purple: '#5856D6',
          pink: '#FF2D55',
          orange: '#FF9500',
          yellow: '#FFCC00',
          green: '#34C759',
          teal: '#5AC8FA',
          indigo: '#5856D6',
          gray: {
            50: '#F2F2F7',
            100: '#E5E5EA',
            200: '#D1D1D6',
            300: '#C7C7CC',
            400: '#AEAEB2',
            500: '#8E8E93',
            600: '#636366',
            700: '#48484A',
            800: '#2C2C2E',
            900: '#1C1C1E',
          }
        }
      },
      backdropBlur: {
        'xs': '2px',
        '3xl': '40px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-hover': '0 12px 40px 0 rgba(31, 38, 135, 0.15)',
        'glass-active': '0 4px 16px 0 rgba(31, 38, 135, 0.1)',
        'ios-float': '0 20px 50px -10px rgba(0, 0, 0, 0.25)',
      }
    },
  },
  plugins: [],
}
