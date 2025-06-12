const colors = require('tailwindcss/colors');
module.exports = {
  content: ['./public/**/*.html', './frontend/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        slate: colors.slate,
        primary: '#0d6efd',
        accent: '#34c759',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: '#0d6efd',
          accent: '#34c759',
        },
      },
    ],
  },
};
