const colors = require('tailwindcss/colors');
module.exports = {
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
        primary: '#007aff',
        success: '#32D74B',
        danger: '#FF4646',
        bg: '#F2F2F7',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: '#007aff',
          accent: '#32D74B',
        },
      },
    ],
  },
};
