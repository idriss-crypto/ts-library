module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true,
        "node": true
    },
    "extends": "standard-with-typescript",
    "overrides": [
        {
            "env": {
                "node": true
            },
            "extends": [
                'plugin:@typescript-eslint/recommended-requiring-type-checking',
            ],
            "files": [
                ".eslintrc.{js,cjs}",
                './**/*.{ts,tsx}'
            ],
            "parserOptions": {
                "sourceType": "script"
            }
        }
    ],
    "parserOptions": {
        "ecmaVersion": "latest"
    },
    "ignorePatterns": ['tests', 'lib'],
    "rules": {
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        '@typescript-eslint/ban-ts-comment': [
            'error',
            {
                'ts-expect-error': false,
            },
        ],
    }
}
