// eslint.config.js

import eslintJs from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
// import { FlatCompat } from "@eslint/eslintrc"; // Keep this commented for now, will use if jsdoc plugin needs it

// Using @eslint/js and eslint-plugin-jsdoc.

export default [
  // Global ignores - Keep this at the top and separate
  {
    ignores: [
      "node_modules/",
      "eslint.config.js", // Ignoring self
      "package.json",
      "package-lock.json",
      ".gitignore"
    ],
  },

  // Configuration for AntiCheatsBP JavaScript files (Minecraft Addon Scripts)
  {
    files: ["AntiCheatsBP/scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { // Minecraft Bedrock Scripting API globals
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        console: "readonly", // Allowed via no-console: off, but good to list
        mc: "readonly",
        world: "readonly",
        system: "readonly",
      },
    },
    plugins: {
      // jsdoc plugin is applied in the dedicated JSDoc config block below
    },
    rules: {
      // Start with eslint:recommended rules
      ...eslintJs.configs.recommended.rules,

      // == Custom Project Style Rules (from StandardizationGuidelines.md & previous setup) ==
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
      'no-console': 'off', // Controlled use via playerUtils.debugLog which uses console.warn
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
      'no-magic-numbers': ['warn', {
        'ignore': [-1, 0, 0.5, 1, 2, 3, 4, 10, 20, 100, 600, 1000],
        'ignoreArrayIndexes': true,
        'enforceConst': true,
      }],
      'no-prototype-builtins': 'warn',
      'no-empty': ['error', { 'allowEmptyCatch': false }],
      'no-invalid-this': 'warn',
      'no-loss-of-precision': 'error',
      'no-useless-catch': 'error',
      'no-useless-escape': 'error',
      'no-useless-return': 'error',
      'prefer-const': 'error',
      'require-await': 'warn',

      // Additional general ESLint rules for code optimization and consistency
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
        ignoreGlobals: false, // Globals are defined above, this ensures they are not flagged if not camelCase by mistake
        allow: ['error_code', 'error_message', 'stack_trace'],
      }],
    },
  },
  // Configuration for Build Scripts (Node.js environment)
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { // Node.js globals
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        console: "readonly", // Explicitly allow console for build scripts
      },
    },
    rules: {
      // Start with eslint:recommended rules
      ...eslintJs.configs.recommended.rules,
      // Apply the same custom style rules as AntiCheatsBP for consistency
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
      'no-console': 'off', // Console is expected in build scripts
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
      'no-magic-numbers': ['warn', {
        'ignore': [-1, 0, 0.5, 1, 2, 3, 4, 10, 20, 100, 600, 1000], // 1 is already in this list, covers process.exit(1)
        'ignoreArrayIndexes': true,
        'enforceConst': true,
      }],
      'no-prototype-builtins': 'warn',
      'no-empty': ['error', { 'allowEmptyCatch': false }],
      'no-invalid-this': 'warn',
      'no-loss-of-precision': 'error',
      'no-useless-catch': 'error',
      'no-useless-escape': 'error',
      'no-useless-return': 'error',
      'prefer-const': 'error',
      // 'require-await': 'warn', // Less relevant for typical build scripts

      // Additional general ESLint rules
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
    }
  },
  // JSDoc specific configuration (applies to both AntiCheatsBP and build scripts)
  {
    ...jsdoc.configs['flat/recommended'],
    files: ["AntiCheatsBP/scripts/**/*.js", "scripts/**/*.js"],
    plugins: {
      jsdoc: jsdoc, // Ensure jsdoc plugin is explicitly associated here
    },
    rules: {
        // Rules from jsdoc.configs['flat/recommended'] are active here first.
        // Subsequent rules in this block will override them.

        'jsdoc/require-jsdoc': [
            'error',
            {
                require: {
                    FunctionDeclaration: true,
                    MethodDefinition: true,
                    ClassDeclaration: true,
                    ArrowFunctionExpression: true,
                    FunctionExpression: true
                },
                contexts: [
                    'ExportDefaultDeclaration',
                    'ExportNamedDeclaration',
                ],
                publicOnly: false,
                checkConstructors: true,
                checkGetters: true,
                checkSetters: true,
            },
        ],
        'jsdoc/require-param': ['error', { checkDestructuredRoots: false }],
        'jsdoc/require-param-type': 'error',
        'jsdoc/require-param-name': 'error',
        'jsdoc/require-param-description': 'off', // MODIFICATION: Turned OFF due to issues with wrapped functions

        'jsdoc/require-returns': ['error', { checkGetters: false }],
        'jsdoc/require-returns-type': 'error',
        'jsdoc/require-returns-description': 'error',

        'jsdoc/no-undefined-types': ['error', { disableReporting: false }],
        'jsdoc/check-types': ['error', { unifyParentAndChildTypeChecks: true, exemptTagContexts: [{tag: 'typedef', types: true}] }],
        'jsdoc/valid-types': 'error',

        'jsdoc/check-alignment': 'warn',
        'jsdoc/check-indentation': 'off', // MODIFICATION: Turned OFF due to persistent false positives

        'jsdoc/check-tag-names': [
            'error',
            {
                definedTags: ['async', 'throws', 'deprecated', 'see', 'example', 'typedef', 'callback', 'property', 'template', 'borrows', 'memberof', 'ignore', 'fileoverview', 'license', 'author', 'type', 'module', 'param', 'returns'],
                jsxTags: false,
            }
        ],
        // This is the primary definition for multiline-blocks, ensuring compactness.
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

        'jsdoc/require-file-overview': ['warn', {
            tags: {
                file: {
                    mustExist: true,
                    preventDuplicates: true,
                },
                author: {
                    mustExist: false,
                    preventDuplicates: true,
                },
                license: {
                    mustExist: false,
                    preventDuplicates: true,
                }
            },
        }],

        'jsdoc/require-description': 'warn',
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
    }
  }
];
