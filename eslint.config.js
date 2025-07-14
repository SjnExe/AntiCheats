import eslintJs from '@eslint/js';
import globals from 'globals';
import eslintPluginJsonc from 'eslint-plugin-jsonc';

export default [
    {
        ignores: [
            'node_modules/',
            'eslint.config.js',
            'package.json',
            'package-lock.json',
            '.gitignore',
            'Dev/',
        ],
    },
    {
        files: ['AntiCheatsBP/scripts/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                mc: 'readonly',
                world: 'readonly',
                system: 'readonly',
            },
        },
        rules: {
            ...eslintJs.configs.recommended.rules,
            'semi': ['error', 'always'],
        },
    },
    ...eslintPluginJsonc.configs['flat/recommended-with-jsonc'],
];
