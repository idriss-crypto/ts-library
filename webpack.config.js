const path = require("path");
const fs = require("fs");
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = (env) => {
  if (env.m == 1) {
    return {
      mode: "production", // "production" | "development" | "none"
      entry: {
        global: "./lib/esnext/bundleGlobal.js",
      },
      output: {
        path: path.resolve(__dirname, "lib/bundle"),
        filename: "[name].js",
      },
      plugins: [new NodePolyfillPlugin()],
    };
  } else {
    return {
      mode: "production", // "production" | "development" | "none"
      entry: {
        module: "./lib/esnext/browser.js",
      },
      output: {
        library: { type: "module" },
        path: path.resolve(__dirname, "lib/bundle"),
        filename: "[name].js",
      },
      experiments: { outputModule: true },
      plugins: [new NodePolyfillPlugin()],
    };
  }
};
