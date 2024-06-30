/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        bounceDown: {
          '0%': { transform: 'translateY(-50%) scale(0)', opacity: '0' },
          '50%': { transform: 'translateY(10%) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(50%) scale(0)', opacity: '0' },
        },
        text: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '100% 200%',
            'background-position': 'right center',
          },
        },
      },
      animation: {
        'bounce-down': 'bounceDown 2s infinite',
        'text': 'text 5s ease infinite',
      },
      fontFamily: {
        primaryLight: ['PrimaryLight'],
        primaryBold: ['PrimaryBold'],
        primaryFat: ['PrimaryFat'],
        primaryRegular: ['PrimaryRegular'],
        primarySemibold: ['PrimarySemibold'],
      },
      screens: {
        'bp-500': '500px',
        'bp-400': '400px',
        'bp-300': '300px',
      }
    },
  },
  plugins: [],
}

