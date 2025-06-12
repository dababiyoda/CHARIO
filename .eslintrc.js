module.exports = {
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  extends: ['airbnb', 'plugin:jsx-a11y/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  ignorePatterns: ['coverage/**', 'node_modules/**'],
  rules: {},
};
