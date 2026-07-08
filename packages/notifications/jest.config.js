const base = require("@adwyzors/jest-config/server");

/** @type {import("jest").Config} */
module.exports = {
  ...base,
  rootDir: ".",
  moduleNameMapper: {
    ...base.moduleNameMapper,
    "^(\\.\\.?/.+)\\.js$": "$1",
  },
};
