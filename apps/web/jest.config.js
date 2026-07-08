const base = require("@adwyzors/jest-config/server");

/** @type {import("jest").Config} */
module.exports = {
  ...base,
  rootDir: ".",
  moduleNameMapper: {
    ...base.moduleNameMapper,
    "^(\\.\\.?/.+)\\.js$": "$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/src/**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
        diagnostics: false,
      },
    ],
  },
};
