const path = require('path');
const fs = require('fs');

module.exports = {
    mode: "production", // "production" | "development" | "none"
    entry: {
        "bundle": "./lib/bundle.js",
    },
    output: {
        library: {type: 'module'},
        path: path.resolve(__dirname, 'lib/bundle'),
        filename:'bundle.js'
    },
    experiments:{outputModule:true},
}
