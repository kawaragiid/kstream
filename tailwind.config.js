/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E50914',
          dark: '#B20710',
          muted: '#B91C1C',
        },
        surface: {
          50: '#111827',
          100: '#0B0F19',
          200: '#161e2e',
          300: '#1f2937',
        },
        text: {
          primary: '#f9fafb',
          secondary: '#d1d5db',
          muted: '#9ca3af',
        },
      },
      backgroundImage: {
        'hero-overlay': 'linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, rgba(3, 7, 18, 0.95) 60%, rgba(3, 7, 18, 1) 100%)',
      },
      boxShadow: {
        'poster': '0 12px 20px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
