# Standardization Guidelines for AntiCheat Addon

This document outlines the consolidated standardization guidelines for the AntiCheat Addon, incorporating directives from `Dev/CodingStyle.md` and further detailing other aspects of code quality and consistency. This will guide the codebase standardization effort.

## 1. References and Precedence

*   `Dev/CodingStyle.md` is a key reference, especially for:
    *   Naming conventions regarding configuration variables, general constants, and specific acronyms (GMC, GMS, TPA, etc.) within JavaScript identifiers.
    *   Command system conventions (prefix, naming, aliases).
    *   `checkType` and `actionType` string identifier casing.
    *   Detailed principles for debugging and logging using `playerUtils.debugLog`.
*   This document expands on `Dev/CodingStyle.md` by providing more explicit guidelines for general coding style, code structure, JSDoc documentation, Minecraft Server API usage, and error handling.
*   Where `Dev/CodingStyle.md` provides a specific directive (e.g., `camelCase` for all constants), it takes precedence.

## 2. Coding Style and Conventions

*   **Naming:**
    *   **Variables, Function Names, Configuration Variables (`config.js`), Constants (General):** Use `camelCase` (e.g., `let myVariable; function processData() {}; export const exampleConfigValue = true; const internalMaxRetries = 3;`).
    *   **Acronyms in JS Identifiers:** Acronyms within `camelCase` identifiers should follow standard camel casing rules (e.g., `enableAntiGmcCheck`, `tpaManager`, `playerTpsData`, not `enableAntiGMCCheck`).
    *   **Class Names:** `PascalCase` (e.g., `class PlayerManager {}`). (Currently not prevalent).
    *   **`checkType` String Identifiers:** `camelCase` (e.g., `playerAntigmc`, `movementFlyHover`). Acronyms are lowercased as part of the camel casing.
    *   **`actionType` String Literals:** `camelCase` (e.g., `warn`, `kick`, `detectedFlyHover`).
*   **Quotes:**
    *   Prefer **single quotes (`'`)** for string literals.
    *   Use **double quotes (`"`)** if the string contains single quotes (e.g., `"Player's data"`) or for JSON objects.
    *   Template literals (``` ` ```) for interpolation or multi-line strings.
*   **Semicolons:** Use semicolons at the end of all statements.
*   **Spacing:**
    *   Single space after commas (e.g., `fn(a, b)`, `[1, 2]`).
    *   Single space around binary operators (e.g., `x = y + 5;`).
    *   No space after opening/before closing parentheses (e.g., `fn(arg)`).
    *   No space between function name and its argument list parentheses (e.g., `myFunction(arg)`).
    *   Space between control flow keywords and their parentheses (e.g., `if (condition)`).
    *   Space before opening curly braces (e.g., `if (condition) {`).
*   **Indentation:** Use 4 spaces. No tabs.
*   **Line Breaks & Length:** Max 120 characters. Break lines thoughtfully, often before operators.
*   **Braces (Curly Braces `{}`):**
    *   Egyptian (K&R variant) style: opening brace on the same line. `else`, `catch`, `finally` on the same line as the preceding closing brace.
    *   Always use braces for blocks (`if`, `for`, `while`, etc.), even single-line ones.
*   **`null` vs. `undefined`:** Use `null` to explicitly indicate an intentional absence of value, especially for objects.

## 3. Code Structure and Organization

*   **Modules (ES6):** Exclusively use ES6 modules (`import`/`export`).
    *   Prefer named exports. Default exports sparingly for single, primary exports.
    *   Use `export * from './module.js';` for barrel files (e.g., `utils/index.js`).
*   **Imports:**
    *   **Grouping & Ordering:**
        1.  Minecraft Server API imports (e.g., `import * as mc from '@minecraft/server';`).
        2.  Local module imports from the addon.
    *   Alphabetize within groups.
    *   Use relative paths (`../`, `./`).
*   **File Structure:** Maintain current logical groups (`checks`, `commands`, `core`, `utils`) and `index.js` barrel files. File names `camelCase.js`.
*   **Function and Variable Declarations:**
    *   `const` for values not reassigned; `let` for reassigned values. Avoid `var`.
    *   Prefer `async function functionName() {}` or `function functionName() {}` for exported/major module functions. Arrow functions are fine for callbacks and internal helpers.
*   **Constants:** Module-specific constants at the top, after imports. Shared config in `config.js`.
*   **Global Scope:** Minimize global scope pollution (ES6 modules help here).

## 4. Documentation Standards

*   **JSDoc (`/** ... */`):**
    *   **Target:** Mandatory for all exported functions, classes, and significant constants. Recommended for complex internal functions.
    *   **Content (Functions):**
        *   Concise summary.
        *   `@param {type} name - description` for all parameters. Use types from `types.js` or Minecraft API.
        *   `@returns {type} description` if applicable.
        *   Optional: `@throws {ErrorType} description`, `@deprecated message`, `@see reference`, `@example code`.
    *   **Content (Constants):** Brief description and `@type {type}`.
    *   **`@typedef`:** Centralize in `types.js` for widely used types, or file-local if specific.
*   **Inline Comments (`//`):**
    *   Clarify complex or non-obvious logic. Place on a line before the code or at line-end for short comments.
    *   Avoid commenting obvious code.
    *   Use `// TODO:` and `// FIXME:` for tracking.
*   **File Header Comments:** Maintain brief JSDoc-style file purpose descriptions at the top.

## 5. API Usage Standards (Minecraft Server API)

*   **Module Imports:** Consistent aliasing (`import * as mc from '@minecraft/server';`). Specific imports for sub-modules (`import { ActionFormData } from '@minecraft/server-ui';`).
*   **World/System Access:** Use `mc.world` and `mc.system`.
*   **Entity/Player Handling:**
    *   Type check with `instanceof mc.Player`.
    *   Check `player.isValid()` before use if staleness is possible.
    *   Use optional chaining (`?.`) for component access (e.g., `player.getComponent("...")?.property`).
    *   Use `EntityComponentTypes`, `ItemComponentTypes` from `mc` for component names.
*   **Dynamic Properties:** Define keys clearly (constants in manager files). Handle `undefined` returns. Wrap `JSON.parse()` in `try...catch`. Be mindful of size limits.
*   **Event Handling:** Check for expected properties in `eventData`. Set `eventData.cancel = true;` explicitly in `beforeEvents`.
*   **Dimension Handling:** Use `world.getDimension(dimensionId)`. Normalize dimension IDs if necessary.
*   **Teleportation:** Use options object with `player.teleport()`, especially `dimension`. Consider `dimension.findClosestSafeLocation()`.
*   **Error Handling:** Wrap API calls that can fail in `try...catch`.
*   **Efficiency:** Avoid expensive API calls in tight loops or frequent tick operations if data can be cached/optimized.

## 6. Error Handling Standards

*   **`try...catch` Blocks:** Mandatory for risky operations (API calls, JSON parsing, complex logic). Use reasonable granularity.
*   **Logging Errors:**
    *   **`console.error(\`[ModuleName] Critical: \${error.stack || error}\`);`**: For critical errors/bugs.
    *   **`playerUtils.debugLog(\`[ModuleName] Handled: \${error.message}\`, context, dependencies);`**: For less critical, handled errors, or debug context. Adhere to performance guidelines in `Dev/CodingStyle.md` for data gathering within `debugLog` calls.
    *   **`logManager.addLog({ actionType: 'error_...', ... }, dependencies);`**: For errors needing admin review (command failures, system errors).
*   **User Feedback:** Provide user-friendly, non-technical error messages for player-initiated actions. Use `getString()` for localization if applicable.
*   **Error Propagation:** Avoid silent catches. Handle locally or let propagate. Top-level handlers in event subscriptions and tick loops are essential.

These guidelines will be applied iteratively across the codebase.
