const base = require('./base')

/** @type {import("jest").Config} */
module.exports = {
  ...base,
  testEnvironment: 'node',
  // Server packages have higher coverage requirements for critical paths
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
