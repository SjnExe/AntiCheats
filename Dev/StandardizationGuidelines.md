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
    *   **Variables, Function Names, Configuration Variables (`config.js`), Constants (General):** Use `camelCase` (e.g., `let myVariable; function processData() {}; export const exampleConfigValue = true; const internalMaxRetries = 3;`). This aligns with `Dev/CodingStyle.md`.
    *   **Acronyms in JS Identifiers:** Acronyms within `camelCase` identifiers should follow standard camel casing rules (e.g., `enableAntiGmcCheck`, `tpaManager`, `playerTpsData`, not `enableAntiGMCCheck`). This clarifies the previous contradiction with `CodingStyle.md`.
    *   **Class Names:** `PascalCase` (e.g., `class PlayerManager {}`). (Currently not prevalent).
    *   **`checkType` String Identifiers:** `camelCase` (e.g., `playerAntiGmc`, `movementFlyHover`). Acronyms are lowercased as part of the camel casing. This aligns with `CodingStyle.md` after its update.
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
*   **`null` vs. `undefined`:** Use `null` to explicitly indicate an intentional absence of value, especially for objects. `undefined` is typically the default state of uninitialized variables or missing properties.
*   **Strict Equality:** Always use strict equality (`===`) and inequality (`!==`) operators instead of loose equality (`==`, `!=`) to avoid unexpected type coercion issues.

## 3. Code Structure and Organization

*   **Modules (ES6):** Exclusively use ES6 modules (`import`/`export`).
    *   Prefer named exports for clarity and tree-shaking benefits. Default exports can be used sparingly for a single, primary export from a module.
    *   Use `export * from './module.js';` for barrel files (e.g., `utils/index.js`, `checks/index.js`).
*   **Imports:**
    *   **Grouping & Ordering:**
        1.  Minecraft Server API imports (e.g., `import * as mc from '@minecraft/server';`).
        2.  Local module imports from the addon (e.g., `import * as playerUtils from '../utils/playerUtils.js';`).
    *   Alphabetize within groups where practical.
    *   Use relative paths (`../`, `./`).
*   **File Structure:** Maintain current logical groups (`checks`, `commands`, `core`, `utils`) and `index.js` barrel files. File names should be `camelCase.js`.
*   **Function and Variable Declarations:**
    *   `const` for values not reassigned; `let` for reassigned values. Avoid `var`.
    *   Prefer `async function functionName() {}` or `function functionName() {}` for exported/major module functions. Arrow functions (`const fn = () => {}`) are fine for callbacks and internal helpers.
*   **Constants and Magic Strings/Numbers:**
    *   Module-specific constants at the top, after imports. Shared config in `config.js`.
    *   Avoid 'magic strings' and 'magic numbers'. Define `camelCase` constants for recurring string literals (tags, event names, property keys) and numeric literals that have specific meanings. This improves readability and makes refactoring safer.
    *   Prefer using `getString(key, params)` utility (which sources from `textDatabase.js`) for all user-facing messages in UI and command responses. Avoid hardcoding user-visible strings directly in logic files.
*   **Global Scope:** Minimize global scope pollution (ES6 modules help here).
*   **Single Responsibility Principle (SRP):** Aim for functions and modules to adhere to the SRP. A function should do one thing well. Modules should group closely related functionalities. This improves modularity, testability, and maintainability.
*   **Pure Functions:** Strive to write pure functions where possible, especially for utility and data transformation logic. Pure functions are easier to test and reason about.

## 4. Documentation Standards

*   **JSDoc (`/** ... */`):**
    *   **Target:** Mandatory for all exported functions, classes, and significant constants. Recommended for complex internal functions.
    *   **Content (Functions):**
        *   Concise summary.
        *   `@param {type} name - description` for all parameters. Strive to use specific types from `@minecraft/server`, custom typedefs from `types.js` (e.g., `import('../types.js').PlayerAntiCheatData`), or primitive types (e.g., `string`, `number`, `boolean`) rather than generic `object` or `any` where possible.
        *   `@returns {type} description` if applicable, with specific typing.
        *   Optional: `@async` if the function is asynchronous, `@throws {ErrorType} description`, `@deprecated message`, `@see reference`, `@example code`.
    *   **Content (Constants):** Brief description and `@type {type}`.
    *   **`@typedef`:** Centralize in `types.js` for widely used types, or file-local if specific. (Current practice is good).
*   **Inline Comments (`//`):**
    *   Clarify complex or non-obvious logic. Place on a line before the code or at line-end for short comments.
    *   Avoid commenting obvious code.
    *   Use `// TODO:` and `// FIXME:` for tracking. When using these, briefly include context, the issue to be addressed, and optionally a name/date if it's a significant item.
*   **File Header Comments:** Maintain brief JSDoc-style file purpose descriptions at the top.

## 5. API Usage Standards (Minecraft Server API)

*   **Module Imports:** Consistent aliasing (`import * as mc from '@minecraft/server';`). Specific imports for sub-modules (`import { ActionFormData } from '@minecraft/server-ui';`).
*   **World/System Access:** Use `mc.world` and `mc.system`.
*   **Entity/Player Handling:**
    *   Type check with `instanceof mc.Player` where necessary.
    *   Check `player.isValid()` before use if staleness is possible (e.g., in delayed callbacks or after potential disconnections).
    *   Utilize optional chaining (`?.`) more consistently when accessing potentially nullable properties from Minecraft API objects or custom data structures to prevent runtime errors (e.g., `player.getComponent("...")?.property`).
    *   Use `EntityComponentTypes`, `ItemComponentTypes` from `mc` for component names.
*   **Dynamic Properties:** Define keys clearly (constants in manager files). Handle `undefined` returns. Wrap `JSON.parse()` in `try...catch`. Be mindful of size limits.
*   **Event Handling:** Check for expected properties in `eventData`. Set `eventData.cancel = true;` explicitly in `beforeEvents` if the event is to be cancelled.
*   **Dimension Handling:** Use `world.getDimension(dimensionId)`. Normalize dimension IDs if necessary.
*   **Teleportation:** Use options object with `player.teleport()`, especially `dimension`. Consider `dimension.findClosestSafeLocation()` for safer teleports.
*   **Error Handling:** Wrap API calls that can fail (e.g., `player.runCommandAsync`, `dimension.spawnEntity`) in `try...catch`.
*   **Efficiency:** Avoid expensive API calls in tight loops or frequent tick operations if data can be cached/optimized. (Refer to `Dev/CodingStyle.md` logging performance section).
*   **Asynchronous Operations:** Ensure all promises returned by functions (especially those involving I/O or Minecraft API calls that can be asynchronous) are properly handled with `await` and wrapped in `try...catch` blocks at the call site if they can reject, or returned to be handled by the caller.

## 6. Error Handling Standards

*   **`try...catch` Blocks:** Mandatory for risky operations (API calls, JSON parsing, complex logic). Use reasonable granularity.
*   **Defensive Programming:** Validate inputs to functions, especially public/exported ones. Check for `null` or `undefined` values where appropriate before accessing properties or performing operations that might throw errors.
*   **Logging Errors:**
    *   **`console.error(\`[ModuleName] Critical: \${error.stack || error}\`);`**: For critical, unrecoverable errors or bugs that might affect system stability.
    *   **`playerUtils.debugLog(\`[ModuleName] Handled Error: \${error.message}\`, context, dependencies);`**: For less critical, handled errors where execution can continue or for providing debug context. Adhere to performance guidelines in `Dev/CodingStyle.md` for data gathering.
    *   **`logManager.addLog({ actionType: 'error_...', ... }, dependencies);`**: For errors needing admin review (e.g., command execution failures, specific system errors that don't halt execution but are notable).
*   **User Feedback:** Provide user-friendly, non-technical error messages for player-initiated actions (e.g., commands, UI interactions). Use `getString()` for localization/consistency.
*   **Error Propagation:** Avoid silent catches unless the error is truly insignificant and expected. Handle errors locally if possible, or let them propagate to a higher-level handler. Top-level handlers in event subscriptions and tick loops are essential to prevent crashes.

## 7. Future Considerations
*   **Automated Formatting:** While manual adherence to formatting is expected, the project may consider adopting an automated code formatter like Prettier in the future to ensure uniform style and reduce review overhead.

These guidelines will be applied iteratively across the codebase.
