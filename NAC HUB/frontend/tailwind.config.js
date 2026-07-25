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
          DEFAULT: '#F97316',
          light: '#FDBA74',
          dark: '#C2410C',
        },
        background: '#F3F4F6',
        surface: '#FFFFFF',
        text: {
          main: '#111827',
          muted: '#6B7280',
        }
      },
      borderRadius: {
        'card': '16px',
        'button': '8px',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
