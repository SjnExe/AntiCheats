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

  // Configuration for JavaScript files in AntiCheatsBP/scripts/
  {
    files: ["AntiCheatsBP/scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        console: "readonly",
        mc: "readonly",
        world: "readonly",
        system: "readonly",
        // Consider adding other Minecraft API globals if used directly, e.g., Player, Entity, etc.
        // However, it's common to import them via 'import * as mc from "@minecraft/server";'
      },
    },
    plugins: {
      jsdoc: jsdoc,
    },
    rules: {
      // Start with eslint:recommended rules
      ...eslintJs.configs.recommended.rules,

      // == Custom Project Style Rules (from StandardizationGuidelines.md & previous setup) ==
      // These will override any conflicting rules from eslint:recommended
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
      'no-console': 'off', // Project specific decision to allow console
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
        'ignore': [-1, 0, 0.5, 1, 2, 3, 4, 10, 20, 100, 600, 1000], // Added 0.5, 3, 4, 20, 600
        'ignoreArrayIndexes': true,
        'enforceConst': true,
      }],
      // Override specific eslint:recommended rules if necessary
      'no-prototype-builtins': 'warn', // Might be too strict for some Minecraft API patterns if not careful
      // 'no-undef': 'error', // This is in eslint:recommended, ensure globals are well-defined
      'no-empty': ['error', { 'allowEmptyCatch': false }], // Guideline: "Avoid silent catches"
      'no-invalid-this': 'warn', // 'this' can be tricky in callbacks, 'warn' is safer
      'no-unused-vars': ['warn', { // Already defined above, but ensure it overrides recommended if different
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_'
      }],
      'no-loss-of-precision': 'error', // Good to keep from recommended
      'no-useless-catch': 'error',     // Good to keep
      'no-useless-escape': 'error',    // Good to keep
      'no-useless-return': 'error',    // Good to keep
      'prefer-const': 'error',         // Good to keep
      'require-await': 'warn',         // Good to keep as warn

      // Note: 'no-async-promise-executor', 'no-misleading-character-class',
      // 'no-useless-backreference', 'require-atomic-updates' are part of eslint:recommended
      // and should be active. No need to re-declare them unless changing their severity.

      // == JSDoc Rules (Initial basic setup - will be expanded in next step) ==
      // The actual JSDoc rules will be populated here or by the plugin's recommended config below.
      // Example: 'jsdoc/require-param-type': 'error',
    },
  },
  // Configuration for JSDoc plugin.
  // Start with jsdoc.configs['flat/recommended'] and then override/add specific rules.
  {
    // This ensures that the JSDoc rules are applied to the same files.
    ...jsdoc.configs['flat/recommended'], // Spread the recommended config
    files: ["AntiCheatsBP/scripts/**/*.js"], // Ensure it applies to the correct files
    plugins: { // Ensure the plugin is explicitly mentioned here too if spreading configs that might not include it
        jsdoc: jsdoc,
    },
    rules: {
        // Override or add specific JSDoc rules here.
        // Rules from jsdoc.configs['flat/recommended'] will be applied first,
        // and these settings will merge with/override them.

        'jsdoc/require-jsdoc': [
            'error', // Enforce JSDoc for exports as per guidelines
            {
                require: {
                    FunctionDeclaration: true,
                    MethodDefinition: true,
                    ClassDeclaration: true,
                    ArrowFunctionExpression: true,
                    FunctionExpression: true,
                },
                contexts: [
                    'ExportDefaultDeclaration',
                    'ExportNamedDeclaration',
                    // Consider adding 'VariableDeclaration' if exported consts with types need full JSDoc blocks
                    // For now, @type inline or above is often used for consts.
                    // Guidelines: "Mandatory for all exported functions, classes, and significant constants."
                    // For exported constants, a separate rule or manual check might be better if they only need @type.
                    // This rule will enforce a full JSDoc block for them if they are ArrowFunctionExpression etc.
                ],
                publicOnly: false,
                checkConstructors: true,
                checkGetters: true, // Guidelines don't specify JSDoc for getters/setters, but it's good practice.
                checkSetters: true,
            },
        ],
        'jsdoc/require-param': ['error', { checkDestructuredRoots: false }],
        'jsdoc/require-param-type': 'error',
        'jsdoc/require-param-name': 'error',
        'jsdoc/require-param-description': 'error', // Enforce param descriptions

        'jsdoc/require-returns': ['error', { checkGetters: false }],
        'jsdoc/require-returns-type': 'error',
        'jsdoc/require-returns-description': 'error', // Enforce return descriptions

        'jsdoc/no-undefined-types': ['error', { disableReporting: false }],
        'jsdoc/check-types': ['error', { unifyParentAndChildTypeChecks: true, exemptTagContexts: [{tag: 'typedef', types: true}] }],
        'jsdoc/valid-types': 'error',

        // 'jsdoc/tag-lines': ['warn', 'always', { startLines: 1, applyToEndTag: false, tags: { 'fileoverview': { lines: 'never' }} }], // Ensure a line after description, no line between tags. fileoverview is special. Temporarily disabled due to affecting too many files for auto-fix.
        'jsdoc/check-alignment': 'warn',
        'jsdoc/check-indentation': ['warn', { "excludeTags": ["example"] } ], // Exclude example tags from indentation checks
        'jsdoc/check-tag-names': [
            'error',
            {
                definedTags: ['async', 'throws', 'deprecated', 'see', 'example', 'typedef', 'callback', 'property', 'template', 'borrows', 'memberof', 'ignore', 'fileoverview', 'license', 'author', 'type', 'module', 'param', 'returns'], // Added 'type', 'module', 'param', 'returns' to be safe
                jsxTags: false,
            }
        ],
        'jsdoc/multiline-blocks': ['warn', {
            noZeroLineText: true,
            noFinalLineText: true,
            noSingleLineBlocks: false, // Allow /** @type {string} */
        }],
        'jsdoc/no-multi-asterisks': ['warn', { preventAtEnd: true, preventAtMiddleLines: true }],
        'jsdoc/require-asterisk-prefix': ['warn', 'always'],
        'jsdoc/no-bad-blocks': ['warn'],


        'jsdoc/check-param-names': ['error', { checkDestructured: false, enableFixer: true }],
        'jsdoc/check-property-names': ['error', { enableFixer: true }],

        // Rule for file overview
        'jsdoc/require-file-overview': ['warn', {
            tags: {
                file: { // Changed from fileoverview to file
                    mustExist: true,
                    preventDuplicates: true,
                },
                author: { // Optional, but good to have
                    mustExist: false,
                    preventDuplicates: true,
                },
                license: { // Optional
                    mustExist: false,
                    preventDuplicates: true,
                }
            },
        }],

        // Discourage @type in JSDoc comments where @param or @returns is more appropriate.
        // This does NOT forbid /** @type {SomeType} */ for variable type annotations.
        // It targets JSDoc blocks for functions primarily.
        // 'jsdoc/no-types': 'warn', // Can be noisy if @type is used for complex param/return structures before full typedefs

        // Rules from StandardizationGuidelines.md
        // - JSDoc mandatory for exported functions, classes, significant constants. (covered by require-jsdoc contexts)
        // - Concise summary (partially covered by rules requiring descriptions)
        // - @param {type} name - description (covered)
        // - @returns {type} description (covered)
        // - Specific types (no-undefined-types, check-types, valid-types)

        // Turned off or kept as warn based on previous config and common sense
        'jsdoc/require-description': 'warn', // require-jsdoc implies a description is needed. This one is more specific about the description *content*.
        'jsdoc/require-description-complete-sentence': 'off',
        'jsdoc/match-description': 'off',
        'jsdoc/no-defaults': 'warn',
        'jsdoc/require-example': 'off',
        'jsdoc/empty-tags': 'warn', // Default is warn, keep it
    }
  }
];
