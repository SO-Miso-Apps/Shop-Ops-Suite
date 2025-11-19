/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  root: true,
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "prettier",
  ],
  globals: {
    shopify: "readonly"
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      rules: {
        // Disable Jest-specific rules for Vitest tests
        'jest/no-deprecated-functions': 'off',
        'testing-library/prefer-screen-queries': 'off',
      },
    },
  ],
};
