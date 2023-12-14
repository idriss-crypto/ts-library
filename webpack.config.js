const path = require("path");
const fs = require("fs");

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
      resolve: {
        fallback: {
          stream: require.resolve("stream-browserify"),
          crypto: require.resolve("crypto-browserify"),
          assert: require.resolve("assert/"),
          http: require.resolve("stream-http"),
          https: require.resolve("https-browserify"),
          url: require.resolve("url/"),
          os: require.resolve("os-browserify/browser"),
        },
      },
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
      resolve: {
        fallback: {
          stream: require.resolve("stream-browserify"),
          crypto: require.resolve("crypto-browserify"),
          assert: require.resolve("assert/"),
          crypto: require.resolve("crypto-browserify"),
          http: require.resolve("stream-http"),
          https: require.resolve("https-browserify"),
          url: require.resolve("url/"),
          os: require.resolve("os-browserify/browser"),
        },
      },
    };
  }
};
