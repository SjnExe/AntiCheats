import eslintJs from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import jsonc from 'eslint-plugin-jsonc';
import globals from 'globals';

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
    ...jsonc.configs['flat/recommended-with-json'],
    {
        files: ['AntiCheatsBP/scripts/**/*.js'],
        plugins: {
            jsdoc: jsdoc,
        },
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
            'quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
            'indent': ['error', 4, { 'SwitchCase': 1 }],
            'no-unused-vars': ['warn', {
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_',
                'caughtErrorsIgnorePattern': '^_'
            }],
            'curly': ['error', 'all'],
            'eqeqeq': ['error', 'always'],
            'no-var': 'error',
            'no-console': 'off', // Default to off, will be overridden where needed
            'brace-style': ['error', '1tbs', { 'allowSingleLine': false }],
            'func-call-spacing': ['error', 'never'],
            'comma-dangle': ['error', 'always-multiline'],
            'comma-spacing': ['error', { 'before': false, 'after': true }],
            'keyword-spacing': ['error', { 'before': true, 'after': true }],
            'space-before-blocks': ['error', 'always'],
            'space-in-parens': ['error', 'never'],
            'space-infix-ops': 'error',
            'arrow-spacing': ['error', { 'before': true, 'after': true }],
            'no-multi-spaces': ['error', { ignoreEOLComments: true }],
            'object-curly-spacing': ['error', 'always'],
            'array-bracket-spacing': ['error', 'never'],
            'max-len': ['warn', {
                code: 256,
                ignoreComments: true,
                ignoreUrls: true,
                ignoreStrings: true,
                ignoreTemplateLiterals: true,
                ignoreRegExpLiterals: true,
            }],
            'no-magic-numbers': 'off',
            'no-prototype-builtins': 'warn',
            'no-empty': ['error', { 'allowEmptyCatch': false }],
            'no-invalid-this': 'warn',
            'no-loss-of-precision': 'error',
            'no-useless-catch': 'error',
            'no-useless-escape': 'error',
            'no-useless-return': 'error',
            'prefer-const': 'error',
            'require-await': 'warn',
            'no-useless-rename': 'warn',
            'no-useless-computed-key': 'warn',
            'no-extra-boolean-cast': 'error',
            'no-extra-semi': 'error',
            'no-lone-blocks': 'warn',
            'no-useless-constructor': 'warn',
            'no-unneeded-ternary': ['warn', { defaultAssignment: false }],
            'prefer-arrow-callback': 'warn',
            'dot-notation': ['warn', { allowKeywords: true }],
            'yoda': ['warn', 'never', { exceptRange: true }],
            'no-else-return': ['warn', { allowElseIf: false }],
            'prefer-template': 'warn',
            'object-shorthand': ['warn', 'properties'],
            'no-useless-concat': 'warn',
            'prefer-object-spread': 'warn',
            'camelcase': ['error', {
                properties: 'always',
                ignoreDestructuring: false,
                ignoreImports: false,
                ignoreGlobals: false,
                allow: ['error_code', 'error_message', 'stack_trace'],
            }],
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',
            'jsdoc/require-param-type': 'off',
            'jsdoc/require-param-name': 'off',
            'jsdoc/require-param-description': 'off',
            'jsdoc/require-returns': 'off',
            'jsdoc/require-returns-type': 'off',
            'jsdoc/require-returns-description': 'off',
            'jsdoc/no-undefined-types': 'off',
            'jsdoc/check-types': 'off',
            'jsdoc/valid-types': 'off',
            'jsdoc/check-alignment': 'warn',
            'jsdoc/check-indentation': 'off',
            'jsdoc/check-tag-names': [
                'error',
                {
                    definedTags: ['async', 'throws', 'deprecated', 'see', 'example', 'typedef', 'callback', 'property', 'template', 'borrows', 'memberof', 'ignore', 'fileoverview', 'license', 'author', 'type', 'module', 'param', 'returns'],
                    jsxTags: false,
                }
            ],
            'jsdoc/multiline-blocks': ['warn', {
                noZeroLineText: true,
                noFinalLineText: true,
                singleLineTags: ['type', 'typedef', 'param', 'returns', 'default', 'deprecated', 'async', 'see', 'ignore', 'license', 'author', 'module'],
                noSingleLineBlocks: false,
            }],
            'jsdoc/no-multi-asterisks': ['warn', { preventAtEnd: true, preventAtMiddleLines: true }],
            'jsdoc/require-asterisk-prefix': ['warn', 'always'],
            'jsdoc/no-bad-blocks': ['warn'],
            'jsdoc/check-param-names': ['error', { checkDestructured: false, enableFixer: true }],
            'jsdoc/check-property-names': ['error', { enableFixer: true }],
            'jsdoc/require-file-overview': 'off',
            'jsdoc/require-description': 'off',
            'jsdoc/require-description-complete-sentence': 'off',
            'jsdoc/match-description': 'off',
            'jsdoc/no-defaults': 'warn',
            'jsdoc/require-example': 'off',
            'jsdoc/empty-tags': 'warn',
            'jsdoc/tag-lines': ['warn', 'never', {
                tags: {
                    'file': { lines: 'never' },
                    'example': { lines: 'any' },
                    'description': { lines: 'never' }
                }
            }],
        },
    },
    {
        files: ["AntiCheatsBP/scripts/core/eventHandlers.js"],
        plugins: {
            jsdoc: jsdoc,
        },
        rules: {
            'jsdoc/require-param-description': 'off',
        }
      }
];
