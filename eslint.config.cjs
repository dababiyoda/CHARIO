const reactPlugin = require('eslint-plugin-react');
const jsxA11y = require('eslint-plugin-jsx-a11y');

module.exports = [
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['node_modules/**', 'coverage/**'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
    },
  },
];
