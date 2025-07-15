import eslintJs from '@eslint/js';
import globals from 'globals';
import eslintPluginJsonc from 'eslint-plugin-jsonc';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
    {
        ignores: [
            'node_modules/',
            'eslint.config.js',
            'package.json',
            'package-lock.json',
            '.gitignore',
            'Dev/',
            'AntiCheatsRP/font/'
        ],
    },
    {
        files: ['AntiCheatsBP/scripts/**/*.js'],
        ...jsdoc.configs['flat/recommended'],
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
            'no-unused-vars': 'warn',
            'no-undef': 'error',
            'quotes': ['error', 'single'],
            'no-trailing-spaces': 'error',
            'indent': ['error', 4],
            'object-curly-spacing': ['error', 'always'],
        },
    },
    ...eslintPluginJsonc.configs['flat/recommended-with-jsonc'],
    {
        files: ['**/*.json'],
        rules: {
            'jsonc/indent': ['error', 4],
            'jsonc/object-curly-spacing': ['error', 'always'],
            'jsonc/array-bracket-spacing': ['error', 'never'],
        },
    },
];
