// @ts-check

import eslint from '@eslint/js';
import globals from 'globals';
import jsonc from 'eslint-plugin-jsonc';
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
        ],
    },
    // Base JS configuration
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021,
                // Minecraft Bedrock Scripting API globals
                'system': 'readonly',
                'world': 'readonly',
                'mc': 'readonly',
                'Minecraft': 'readonly',
                'mojang-minecraft': 'readonly',
                'mojang-gametest': 'readonly',
                'mojang-minecraft-ui': 'readonly',
                'mojang-server-admin': 'readonly',
                'mojang-net': 'readonly',
            },
        },
        linterOptions: {
            reportUnusedDisableDirectives: 'error',
        },
        rules: {
            ...eslint.configs.recommended.rules,
            'camelcase': ['error', { 'properties': 'always', 'ignoreDestructuring': true, 'allow': ['^UNSAFE_'] }],
            'indent': ['error', 4, { 'SwitchCase': 1 }],
            'quotes': ['error', 'single', { 'avoidEscape': true }],
            'semi': ['error', 'always'],
            'no-trailing-spaces': 'error',
            'no-unused-vars': ['warn', { 'args': 'none' }],
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
