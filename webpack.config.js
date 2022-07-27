const path = require('path');
const fs = require('fs');

module.exports = {
    mode: "production", // "production" | "development" | "none"
    entry: {
        "global": "./lib/esnext/bundleGlobal.js",
        "module": "./lib/esnext/browser.js",
    },
    output: {
        library: {type: 'module'},
        path: path.resolve(__dirname, 'lib/bundle'),
        filename:'[name].js'
    },
    experiments:{outputModule:true},
}
