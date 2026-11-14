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
          50: '#181818',
          100: '#141414',
          200: '#1f1f1f',
          300: '#2a2a2a',
        },
        text: {
          primary: '#f9fafb',
          secondary: '#d1d5db',
          muted: '#9ca3af',
        },
      },
      backgroundImage: {
        'hero-overlay': 'linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, rgba(20, 20, 20, 0.95) 60%, rgba(20, 20, 20, 1) 100%)',
      },
      boxShadow: {
        'poster': '0 12px 20px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
