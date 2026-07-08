const base = require('./index')

/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...base,
  extends: [
    ...base.extends,
    'next/core-web-vitals',
    'next/typescript',
  ],
  rules: {
    ...base.rules,
    // Allow process.env in Next.js config files only (next.config.ts, etc.)
    // Override on per-file basis where needed
  },
}
