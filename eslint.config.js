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
      'brace-style': ['error', 'stroustrup', { 'allowSingleLine': false }],
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
        code: 200,
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
      'no-empty': ['error', { 'allowEmptyCatch': true }], // Keep custom preference for empty catch blocks
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
            'warn', // Warn for now, can be 'error' later. Set to warn to avoid too many initial errors.
            {
                require: {
                    FunctionDeclaration: true,
                    MethodDefinition: true,
                    ClassDeclaration: true,
                    ArrowFunctionExpression: true, // Enforce for exported arrow functions if they act as module functions
                    FunctionExpression: true,
                },
                contexts: [
                    // Require JSDoc for all exports
                    'ExportDefaultDeclaration',
                    'ExportNamedDeclaration',
                    // Add other specific contexts if necessary
                ],
                publicOnly: false, // Check all, not just exported with @public
                checkConstructors: true,
                checkGetters: true,
                checkSetters: true,
            },
        ],
        'jsdoc/require-param': ['error', { checkDestructuredRoots: false }], // checkDestructuredRoots: false to avoid issues with complex destructuring
        'jsdoc/require-param-type': 'error',
        'jsdoc/require-param-name': 'error',
        'jsdoc/require-param-description': 'warn', // Warn for now, good to have but can be verbose

        'jsdoc/require-returns': ['error', { checkGetters: false }], // Getters implicitly return
        'jsdoc/require-returns-type': 'error',
        'jsdoc/require-returns-description': 'warn', // Warn for now

        'jsdoc/no-undefined-types': ['error', { disableReporting: false }], // Crucial for type correctness
        'jsdoc/check-types': ['error', { unifyParentAndChildTypeChecks: true, exemptTagContexts: [{tag: 'typedef', types: true}] }], // check types in @param, @returns etc.
        'jsdoc/valid-types': 'error', // Validates type names

        'jsdoc/tag-lines': ['warn', 'never', { startLines: 1 }], // Adds a blank line after the description and before tags. 'never' means no blank line. Let's try 'always' for readability.
                                                              // Update: 'always' adds blank line between block and first tag, 'never' for between tags.
                                                              // The provided config in print-config was 'tag-lines': [1], which is 'warn'.
                                                              // Let's set to warn, with one line before tags.
        // 'jsdoc/tag-lines': ['warn', 'any', { startLines: 1, endLines: 0, tags: {} }], // More flexible, allows single line for simple cases.

        'jsdoc/check-alignment': 'warn', // Default is warn
        'jsdoc/check-indentation': 'warn',
        'jsdoc/check-tag-names': [ // Ensure this is set correctly based on StandardizationGuidelines
            'error',
            {
                definedTags: ['async', 'throws', 'deprecated', 'see', 'example', 'typedef', 'callback', 'property', 'template', 'borrows', 'memberof', 'ignore', 'fileoverview', 'license', 'author'],
                jsxTags: false, // No JSX in this project
            }
        ],
        'jsdoc/multiline-blocks': ['warn', { // Default is warn
            noZeroLineText: true,
            noFinalLineText: true,
            noSingleLineBlocks: false, // Allow single line for brief docs e.g. /** @type {string} */
        }],
        'jsdoc/no-multi-asterisks': ['warn', { preventAtEnd: true, preventAtMiddleLines: true }], // Default is warn
        // 'jsdoc/empty-tags': ['warn', { tags: ['typedef', 'param', 'returns'] }], // Temporarily disabled to reduce noise
        // Default is warn, but error for some makes sense. Let's keep warn.

        // Rules to consider making errors if they are warnings by default:
        'jsdoc/check-param-names': ['error', { checkDestructured: false, enableFixer: true }],
        'jsdoc/check-property-names': ['error', { enableFixer: true }],


        // Rules from StandardizationGuidelines.md
        // - JSDoc mandatory for exported functions, classes, significant constants. (covered by require-jsdoc contexts)
        // - Concise summary (enforced by require-description, though that can be broad)
        // - @param {type} name - description (require-param, require-param-type, require-param-name, require-param-description)
        // - @returns {type} description (require-returns, require-returns-type, require-returns-description)
        // - Specific types (no-undefined-types, check-types, valid-types)
        // - Optional tags: @async, @throws, @deprecated, @see, @example (check-tag-names covers these as known)
        // - @typedef in types.js (This is more of a structural convention, but no-undefined-types helps ensure they are defined)

        // Turn off some verbose or overly strict rules from recommended if needed, or keep them as warnings.
        'jsdoc/require-description-complete-sentence': 'off', // Can be too pedantic
        'jsdoc/match-description': 'off', // Regex matching for description can be too complex to maintain
        'jsdoc/no-defaults': 'warn', // Default is warn, it's okay for params to have defaults documented.
        'jsdoc/require-example': 'off', // Examples are good but not always necessary for every function.

        // Customization for 'max-len' for JSDoc comments if needed, though ESLint's global max-len ignores comments by default.
        // 'jsdoc/text-escaping': 'warn', // For escaping characters in descriptions
    }
  }
];
