// @ts-check

import eslint from '@eslint/js';
import globals from 'globals';
import jsonc from 'eslint-plugin-jsonc';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: eslint.configs.recommended,
});

export default [
    {
        ignores: [
            'node_modules/',
            'dist/',
            'package-lock.json',
            '.git/',
            'AntiCheatsRP/font/',
            'tsconfig.json',
            'eslint.config.js', // Also ignore the eslint config itself
        ],
    },
    // Base JS configuration with TypeScript support
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021,
            },
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.json',
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        linterOptions: {
            reportUnusedDisableDirectives: 'error',
        },
        plugins: {
            '@typescript-eslint': ts,
        },
        rules: {
            ...eslint.configs.recommended.rules,
            ...ts.configs['eslint-recommended'].rules,
            ...ts.configs['recommended-type-checked'].rules,
            'camelcase': ['error', { 'properties': 'always', 'ignoreDestructuring': true, 'allow': ['^UNSAFE_'] }],
            'indent': ['error', 4, { 'SwitchCase': 1 }],
            'quotes': ['error', 'single', { 'avoidEscape': true }],
            'semi': ['error', 'always'],
            'no-trailing-spaces': 'error',
            'no-unused-vars': 'off', // Covered by @typescript-eslint/no-unused-vars
            '@typescript-eslint/no-unused-vars': ['warn', { 'args': 'none' }],
            'no-undef': 'error',
            'object-curly-spacing': ['error', 'always'],
            'comma-dangle': ['error', 'always-multiline'],
            'no-console': 'off',
            'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
            'keyword-spacing': ['error', { 'before': true, 'after': true }],
            'space-before-function-paren': ['error', {
                'anonymous': 'always',
                'named': 'never',
                'asyncArrow': 'always',
            }],
            'arrow-spacing': ['error', { 'before': true, 'after': true }],
            // Disable rules that are not helpful in this project
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
    // JSONC configuration
    ...jsonc.configs['flat/recommended-with-jsonc'],
    {
        files: ['**/*.json'],
        rules: {
            'jsonc/indent': ['error', 4],
            'jsonc/object-curly-spacing': ['error', 'always'],
            'jsonc/array-bracket-spacing': ['error', 'never'],
            'jsonc/comma-dangle': ['error', 'never'],
            'jsonc/key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
            'jsonc/object-curly-newline': ['error', { 'multiline': true, 'consistent': true }],
            'jsonc/object-property-newline': ['error', { 'allowAllPropertiesOnSameLine': true }],
        },
    },
];
