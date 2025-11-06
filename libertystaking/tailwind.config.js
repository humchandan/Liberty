/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    // Add more folders if you use src/ etc.
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Manrope', 'Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        primary: '#8b5cf6',
        fuchsia: '#C026D3',
        liberty: '#0066FF',
        accent: '#21F7FF',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #c026d3 0%, #0ea5e9 100%)',
      },
    },
  },
  plugins: [],
};
