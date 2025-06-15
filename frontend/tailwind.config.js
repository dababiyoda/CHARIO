const colors = require('tailwindcss/colors');
module.exports = {
  content: ['./public/**/*.html', './frontend/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont'],
      },
      borderRadius: {
        lg: '1rem',
        full: '9999px',
      },
      colors: {
        slate: colors.slate,
        primary: '#0A84FF',
        success: '#32D74B',
        danger: '#FF4646',
        bg: '#F2F2F7',
      },
      padding: {
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-t': 'env(safe-area-inset-top)',
      },
    },
  },
  plugins: [require('daisyui'), require('@tailwindcss/typography')],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: '#0A84FF',
          accent: '#32D74B',
        },
      },
    ],
  },
};
