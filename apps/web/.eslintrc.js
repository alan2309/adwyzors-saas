module.exports = {
  extends: [
    'next/core-web-vitals',
    'next/typescript',
  ],
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    // ❌ No `any` — enforced project-wide
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',

    // ❌ No process.env — use @adwyzors/config instead
    'no-restricted-syntax': [
      'error',
      {
        selector: "MemberExpression[object.name='process'][property.name='env']",
        message:
          'Do not access process.env directly. Import from @adwyzors/config instead: import { config } from "@adwyzors/config"',
      },
    ],
  },
  root: true,
}
