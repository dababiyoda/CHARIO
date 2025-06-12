module.exports = {
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  extends: ['airbnb', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: ['coverage/**', 'node_modules/**'],
  rules: {},
};
