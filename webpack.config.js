const path = require('path');
const fs = require('fs');

module.exports = {
    mode: "production", // "production" | "development" | "none"
    entry: {
        "global": "./lib/bundleGlobal.js",
        "module": "./lib/browser.js",
    },
    output: {
        library: {type: 'module'},
        path: path.resolve(__dirname, 'lib/bundle'),
        filename:'[name].js'
    },
    experiments:{outputModule:true},
}
