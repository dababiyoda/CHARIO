const colors = require('tailwindcss/colors');
module.exports = {
  darkMode: 'class',
  content: ['./public/**/*.html', './frontend/**/*.{js,jsx}'],
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
    },
  },
  plugins: [
    require('daisyui'),
    require('@tailwindcss/typography'),
    require('tailwindcss-safe-area'),
  ],
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
