/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: ['../frontend/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};
export default config;
