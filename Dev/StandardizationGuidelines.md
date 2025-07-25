# Standardization Guidelines for AntiCheat Addon

This document outlines the consolidated standardization guidelines for the AntiCheat Addon, incorporating directives from `Dev/CodingStyle.md` and further detailing other aspects of code quality and consistency. This will guide the codebase standardization effort.

## 1. References and Precedence

- `Dev/CodingStyle.md` is a key reference, especially for:
  - Naming conventions regarding configuration variables, general constants, and specific acronyms (GMC, GMS, TPA, etc.) within JavaScript identifiers.
  - Command system conventions (prefix, naming, aliases).
  - `checkType` and `actionType` string identifier casing.
  - Detailed principles for debugging and logging using `playerUtils.debugLog`.
- This document expands on `Dev/CodingStyle.md` by providing more explicit guidelines for general coding style, code structure, JSDoc documentation, Minecraft Server API usage, and error handling.
- Where `Dev/CodingStyle.md` provides a specific directive (e.g., `camelCase` for all constants), it takes precedence.

## 2. Coding Style and Conventions

- **Naming:**
  - **Variables, Function Names, Configuration Variables (`config.js`), Constants (General), Object Properties:** Use `camelCase` (e.g., `let myVariable; function processData() {}; export const exampleConfigValue = true; const internalMaxRetries = 3; const obj = { myProperty: 1 };`). This aligns with `Dev/CodingStyle.md` and is now enforced by ESLint's `camelcase` rule.
  - **Acronyms in JS Identifiers:** Acronyms within `camelCase` identifiers should follow standard camel casing rules (e.g., `enableAntiGmcCheck`, `tpaManager`, `playerTpsData`, not `enableAntiGMCCheck`).
  - **Class Names:** `PascalCase` (e.g., `class PlayerManager {}`). (Currently not prevalent).
  - **`checkType` String Identifiers:** Must use `camelCase` (e.g., `playerAntiGmc`, `movementFlyHover`). This is critical for linking detections in check scripts to `actionProfiles.js` and `automodConfig.js`. Acronyms are lowercased as part of the camel casing.
  - **`actionType` String Literals:** Must use `camelCase` (e.g., `warn`, `kick`, `detectedFlyHover`). This applies to `log.actionType` in `actionProfiles.js` and rule `actionType` in `automodConfig.js`.
  - **ESLint Enforcement**: The `camelcase` ESLint rule is active to help maintain these naming conventions. Exceptions for specific patterns (e.g. `error_code` in external data) are configured in `eslint.config.js`.
- **Quotes:**
  - Prefer **single quotes (`'`)** for string literals.
  - Use **double quotes (`"`)** if the string contains single quotes (e.g., `"Player's data"`) or for JSON objects.
  - Template literals (`` ` ``) for interpolation or multi-line strings.
- **Semicolons:** Use semicolons at the end of all statements.
- **Spacing:**
  - Single space after commas (e.g., `fn(a, b)`, `[1, 2]`).
  - Single space around binary operators (e.g., `x = y + 5;`).
  - No space after opening/before closing parentheses (e.g., `fn(arg)`).
  - No space between function name and its argument list parentheses (e.g., `myFunction(arg)`).
  - Space between control flow keywords and their parentheses (e.g., `if (condition)`).
  - Space before opening curly braces (e.g., `if (condition) {`).
- **Indentation:** Use 4 spaces. No tabs.
- **Line Breaks & Length:** Max 256 characters. This has been increased to better accommodate long descriptive strings (e.g., in log messages or detailed comments) and complex conditions without excessive fragmentation. However, complex logical statements should still be broken thoughtfully, often before operators, to maintain readability.
- **Braces (Curly Braces `{}`):**
  - Egyptian (K&R variant) style: opening brace on the same line. `else`, `catch`, `finally` on the same line as the preceding closing brace.
  - Always use braces for blocks (`if`, `for`, `while`, etc.), even single-line ones.
- **`null` vs. `undefined`:** Use `null` to explicitly indicate an intentional absence of value, especially for objects. `undefined` is typically the default state of uninitialized variables or missing properties.
- **Strict Equality:** Always use strict equality (`===`) and inequality (`!==`) operators instead of loose equality (`==`, `!=`) to avoid unexpected type coercion issues.

## 3. Code Structure and Organization

- **Modules (ES6):** Exclusively use ES6 modules (`import`/`export`).
  - Prefer named exports for clarity and tree-shaking benefits. Default exports can be used sparingly for a single, primary export from a module.
  - Use `export * from './module.js';` for barrel files (e.g., `utils/index.js`, `checks/index.js`).
- **Imports:**
  - **Grouping & Ordering:**
    1. Minecraft Server API imports (e.g., `import * as mc from '@minecraft/server';`).
    2. Local module imports from the addon (e.g., `import * as playerUtils from '../utils/playerUtils.js';`).
  - Alphabetize within groups where practical.
  - Use relative paths (`../`, `./`).
- **File Structure:** Maintain current logical groups (`checks`, `commands`, `core`, `utils`) and `index.js` barrel files. File names should be `camelCase.js`.
- **Function and Variable Declarations:**
  - `const` for values not reassigned; `let` for reassigned values. Avoid `var`.
  - Prefer `async function functionName() {}` or `function functionName() {}` for exported/major module functions. Arrow functions (`const fn = () => {}`) are fine for callbacks and internal helpers.
- **Constants and Magic Strings/Numbers:**
  - Module-specific constants at the top, after imports. Shared config in `config.js`.
  - Avoid 'magic strings' and 'magic numbers'. Define `camelCase` constants for recurring string literals (tags, event names, property keys) and numeric literals that have specific meanings. This improves readability and makes refactoring safer.
  - For most user-facing messages (command responses, dynamic UI content), prefer using `getString(key, params)` from `textDatabase.js`. However, for highly specific, static, single-use UI labels or button texts within UI modules (like `uiManager.js`), these should be hardcoded directly in the module. Panel button texts (for `!panel`) are defined in `AntiCheatsBP/scripts/core/panelLayoutConfig.js`.
- **Global Scope:** Minimize global scope pollution (ES6 modules help here).
- **Single Responsibility Principle (SRP):** Aim for functions and modules to adhere to the SRP. A function should do one thing well. Modules should group closely related functionalities. This improves modularity, testability, and maintainability.
- **Pure Functions:** Strive to write pure functions where possible, especially for utility and data transformation logic. Pure functions are easier to test and reason about.

## 4. Documentation Standards

- **JSDoc (`/** ... */`):**
  - **Target:** Mandatory for all exported functions, classes, and significant constants. Recommended for complex internal functions.
  - **Content (Functions):**
    - **Concise Summary**: The main description should be brief and to the point. If the function's purpose, parameters, and return type are very clear from its name and signature (e.g., `function getUserById(id: string): User`), the summary can be extremely brief, focusing only on non-obvious aspects or side effects. Avoid restating the obvious.
    - **Compactness**:
      - **Single-line JSDoc comments are highly preferred** for simple type annotations (e.g., `/** @type {string} */`) or very short, self-contained descriptions (e.g., `/** @returns {boolean} True if action was successful. */` or `/** Processes user input. */`), where single line comment should never use multi line comment style.
      - ESLint rules are configured to support this:
        - `jsdoc/multiline-blocks` allows single-line blocks.
        - `jsdoc/tag-lines` is set to 'never' to minimize empty lines.
        - `jsdoc/require-description-complete-sentence` is 'off', allowing non-sentence descriptions for brevity.
      - Example of a compact, multi-tag single-line comment: `/** @param {string} id - The user ID. @returns {User | null} The user or null if not found. */` (if appropriate for very simple functions).
    - `@param {type} name - description`: Descriptions for parameters should be concise. If the parameter's role is evident from its name and type (e.g., `@param {string} name`), a very brief description is sufficient. For highly self-documenting internal or simple functions, if ESLint rules were more relaxed on param descriptions, it might be omitted, but current rules (`jsdoc/require-param-description`) enforce it. Keep it short.
    - `@returns {type} description`: Similar to params, keep return descriptions brief and focused. If the return is obvious (e.g., `@returns {boolean} True if validation passed, false otherwise.`), don't over-explain.
    - Strive to use specific types from `@minecraft/server`, custom typedefs from `types.js` (e.g., `import('../types.js').PlayerAntiCheatData`), or primitive types. Avoid generic `object` or `any` where possible.
    - Optional: `@async` if the function is asynchronous, `@throws {ErrorType} description`, `@deprecated message`, `@see reference`, `@example code`.
  - **Content (Constants):** Brief description and `@type {type}`. Single-line JSDoc is often sufficient: `/** @type {number} Maximum retry attempts. */`.
  - **`@typedef`:** Centralize in `types.js` for widely used types, or file-local if specific. Descriptions for properties within `@typedef` should also be concise.
- **Inline Comments (`//`):**
  - **Purpose**: Clarify complex, non-obvious logic, or the *reason* behind a piece of code if it's not immediately clear. Do not explain *what* the code is doing if it's self-evident.
    - Example (Good): `// Offset by 1 to align with the legacy system's 1-based indexing.`
    - Example (Bad): `// Increment counter` followed by `counter++;`
  - **Conciseness**: Keep inline comments brief and to the point.
  - Avoid obvious or redundant comments, and there should be no unnecessary comments or empty lines.
  - Use `// TODO:` and `// FIXME:` for tracking. Briefly include context, the issue, and optionally a name/date.
- **File Header Comments:**
  - Maintain brief JSDoc-style file purpose descriptions at the top (`@file`).
  - This can be a single line for simple files: `/** @file Utility functions for array manipulation. */`
  - The `@author` and `@license` tags are optional but good practice.
  - **Variable Type Annotation with `@type`**:
    - For annotating variable types using JSDoc, **always prefer the most compact form**. Single-line `/** @type {TypeName} */ let myVar;` is ideal when no further description for the variable itself is needed.
    - **Omit the `/** @type {...} */` annotation entirely if a variable's type is unambiguously obvious from its initial assignment** (e.g., `const name = "John";`, `const isValid = true;`, `const count = 0;`, `const user = new User();`). This is crucial for reducing verbosity.
    - Use `@type` primarily when the type is not immediately clear from the assignment (e.g., `let data; /** @type {ComplexType | null} */ data = fetchData();` or for parameters/return types in JSDoc blocks).
    - The goal is to maintain clarity while minimizing clutter from overly verbose or redundant type comments.

## 5. API Usage Standards (Minecraft Server API)

- **Module Imports:** Consistent aliasing (`import * as mc from '@minecraft/server';`). Specific imports for sub-modules (`import { ActionFormData } from '@minecraft/server-ui';`).
- **World/System Access:** Use `mc.world` and `mc.system`.
- **Entity/Player Handling:**
  - Type check with `instanceof mc.Player` where necessary.
  - Check `player.isValid()` before use if staleness is possible (e.g., in delayed callbacks or after potential disconnections). This is critical to prevent errors with stale player objects.
  - Utilize optional chaining (`?.`) consistently and proactively when accessing potentially nullable properties from Minecraft API objects (e.g., `player.getComponent("...")?.property`) or custom data structures (e.g., `pData?.flags?.someFlag`). This helps prevent runtime errors and improves code robustness.
  - Use `EntityComponentTypes`, `ItemComponentTypes` from `mc` for component names (e.g., `mc.EntityComponentTypes.Inventory` or `mc.ItemComponentTypes.Durability`).
- **Dynamic Properties:** Define keys clearly (constants in manager files, e.g., `playerDataManager.js`). Handle `undefined` returns from `getDynamicProperty`. Wrap `JSON.parse()` in `try...catch`. Be mindful of size limits (approx. 32KB per property).
- **Event Handling:** Check for expected properties in `eventData`. Set `eventData.cancel = true;` explicitly in `beforeEvents` if the event is to be cancelled.
- **Dimension Handling:** Use `world.getDimension(dimensionId)`. Normalize dimension IDs if necessary.
- **Teleportation:** Use options object with `player.teleport()`, especially `dimension`. Consider `dimension.findClosestSafeLocation()` for safer teleports.
- **Error Handling:** Wrap API calls that can fail (e.g., `player.runCommandAsync`, `dimension.spawnEntity`) in `try...catch`.
- **Efficiency:** Avoid expensive API calls in tight loops or frequent tick operations if data can be cached/optimized. (Refer to `Dev/CodingStyle.md` logging performance section).
- **Asynchronous Operations:** Ensure all promises returned by functions (especially those involving I/O or Minecraft API calls that can be asynchronous) are properly handled with `await` and wrapped in `try...catch` blocks at the call site if they can reject, or returned to be handled by the caller.

## 6. Logging and Error Handling Standards

This section details standards for both general diagnostic logging and persistent error/event logging.

### 6.1. General Logging Practices & `playerUtils.debugLog()`

`playerUtils.debugLog()` (which wraps `console.warn`) should be used for transient, detailed debugging information. This is for messages primarily useful during development, troubleshooting specific issues, or when actively "watching" a player's activity via the `isWatched` flag in their `pData`. These logs are not intended for a persistent audit trail of significant server events or errors that require admin review after the fact.

- **Conditionality**:
  - All `debugLog` calls **MUST** be conditional on `dependencies.config.enableDebugLogging`.
  - Player-specific `debugLog` calls containing sensitive or overly verbose per-player details **SHOULD** also be conditional on `pData.isWatched`.
- **Content**: Messages can be verbose. They should provide enough context to understand the state or flow at that point in the code (e.g., variable values, function entry/exit points, specific conditions met).
- **Context Prefixing**:
  - If the `contextPlayerNameIfWatched` parameter of `debugLog` is provided (typically `pData.isWatched ? player.nameTag : null`), `debugLog` automatically prefixes the output with `[AC Watch - PlayerName]`.
  - If `contextPlayerNameIfWatched` is `null` (e.g., for global system debug messages not tied to a specific watched player, or when player context is unavailable/irrelevant), the message string passed to `debugLog` **MUST** itself begin with a context marker:
    - Format: `[SourceIdentifier] Actual log message...`
    - `SourceIdentifier`: Typically `ModuleName` or `ModuleName.FunctionName` (e.g., `[CoreSystem.init]`, `[FlyCheck.velocityEval]`).
  - The `contextPlayerNameIfWatched` parameter can also accept a non-player-name string to serve as a general context label if `enableDebugLogging` is true. For example: `playerUtils.debugLog("Detailed state dump...", dependencies, "MyModule.StateDumpContext");` would output `[AC Watch - MyModule.StateDumpContext] Detailed state dump...` if watched, or `[AC Debug] Detailed state dump...` if not watched but global debug is on (the internal prefixing logic of `debugLog` handles this). It's preferred to bake the context into the message string if not using the player-watch feature for that log.
  - **Goal**: Every `debugLog` output in the console should clearly indicate its origin or primary context.

### 6.2. Persistent Logging with `logManager.addLog()`

`logManager.addLog()` is used for creating a persistent record of significant events, actions, and standardized errors that administrators might need to review later. This forms an audit trail.

- **Non-Error Events**:
  - For general significant events (e.g., player joins, command executions, moderation actions taken), the `LogEntry` should be clear and concise.
  - The `details` field can be a descriptive string or a simple object containing relevant parameters for the event.
  - `actionType` should be descriptive and `camelCase` (e.g., `playerInitialJoin`, `commandKickExecuted`).
- **Error Events**:
  - Error logging **MUST** follow the detailed standards below to ensure consistency and actionability.
  - **`actionType` Naming Convention**:
    - All error-related `actionType`s **MUST** follow the pattern: `error.<module>.<operationOrContext>[.<specificError>]`
      - `<module>`: Short identifier for the module (e.g., `pdm`, `cmd`, `main`).
      - `<operationOrContext>`: Brief description of the operation (e.g., `dpRead`, `exec`, `playerTick`).
      - `[.<specificError>]`: Optional, more specific error type (e.g., `parseFail`, `notFound`).
      - All parts should be `camelCase` or `lowerCase`.
    - Examples: `error.pdm.dpRead.parseFail`, `error.cmd.exec.permission`, `error.main.playerTick.generic`.
  - **`LogEntry.details` Object Structure**:
    - When `actionType` indicates an error, `details` **MUST** be an object.
    - **Mandatory fields in `details`**:
      - `errorCode`: (String) A unique, `UPPER_SNAKE_CASE` code (e.g., `PDM_DP_READ_PARSE_FAIL`, `CMD_EXEC_PERMISSION_DENIED`). Convention: `MODULE_OPERATION_ERROR[_SUBTYPE]`.
      - `message`: (String) The primary error message (usually `error.message`).
    - **Highly Recommended field in `details`**:
      - `rawErrorStack`: (String, Optional) The full stack trace from `error.stack`.
    - **Optional field in `details`**:
      - `meta`: (Object, Optional) For context-specific key-value pairs (e.g., input parameters, state variables). Example: `meta: { commandName: 'kick', targetId: 'Player123' }`.
  - **`LogEntry.context`**:
    - This field **MUST** provide the specific function or module path where the error originated (e.g., `playerDataManager.loadPlayerDataFromDynamicProperties`, `commands/kick.execute`).
  - **Example Error Log Call**:
  ```javascript
  // Inside a function in playerDataManager.js
  logManager.addLog({
      actionType: 'error.pdm.dpRead.parseFail',
      context: 'playerDataManager.loadPlayerDataFromDynamicProperties',
      targetName: playerName, // If applicable
      details: {
          errorCode: 'PDM_DP_READ_PARSE_FAIL',
          message: error.message,
          rawErrorStack: error.stack,
          meta: { propertyKey: 'anticheat:pdata_v1' }
      }
  }, dependencies);
  ```

### 6.3. Direct `console.error()` Usage

- **Purpose**: Reserve for truly critical, unrecoverable errors or bugs that might indicate system instability or an immediate problem requiring developer attention. These are usually errors that might halt a module's function or the entire script if not caught at a very high level.
- **Content**: Should include `error.stack` for full trace and be prefixed with a clear module identifier (e.g., `[MyModule CRITICAL]`).
- **`try...catch` Blocks:** Mandatory for risky operations (API calls, JSON parsing, complex logic). Use reasonable granularity.
- **Defensive Programming:** Validate inputs to functions, especially public/exported ones. Check for `null` or `undefined` values where appropriate before accessing properties or performing operations that might throw errors.
- **User Feedback:** Provide user-friendly, non-technical error messages for player-initiated actions. Use `getString()` for localization/consistency.
- **Error Propagation:** Avoid silent catches unless the error is truly insignificant and expected. Handle errors locally if possible, or let them propagate to a higher-level handler. Top-level handlers in event subscriptions and tick loops are essential to prevent crashes.

## 7. Text Management & `textDatabase.js`

The `AntiCheatsBP/scripts/core/textDatabase.js` file serves as a centralized repository for user-facing strings and other important text literals. Its proper use enhances maintainability, consistency, and prepares for potential future localization. All text retrieved from this database should use the `playerUtils.getString(key, params?)` utility.

1. **Purpose of `textDatabase.js`**:
   - To store reusable or configurable strings that are displayed to users (players or admins via chat, UI forms, etc.), especially command responses and dynamic messages.
   - To manage text that might need configuration or frequent updates by developers.
   - To ensure consistency in terminology and tone for common messages across the addon.
   - To centralize text that might be subject to future localization efforts (excluding single-use static UI labels and panel button texts, which are hardcoded or in `panelLayoutConfig.js`).
2. **Key Naming and Structure**:
   - **Dot Notation Hierarchy**: Keys **MUST** use a dot-notation hierarchy to create a logical structure. For example: `category.moduleOrFeature.specificIdentifier`.
     - Examples: `common.button.confirm`, `ui.adminPanel.title`, `command.kick.success`, `error.config.loadFailure`.
   - **Key Segment Naming**: Each segment in the key should be `camelCase` or `lowercase`.
   - **Clarity and Specificity**: Keys should be descriptive enough to understand their context and purpose without needing to see the value.
   - **Sub-grouping**: As the number of strings for a particular module, UI panel, or command grows, consider adding deeper levels of sub-grouping to maintain organization. For example, if `command.myCommand.*` becomes very large, you might introduce `command.myCommand.help.*`, `command.myCommand.error.*`, etc.
3. **When to Use `textDatabase.js` (Inclusion Criteria)**:
   - **Reused Strings**: Strings that are used in more than one place in the codebase **MUST** be in `textDatabase.js`.
   - **User-Facing Text (General)**: Text displayed directly to players or admins, such as command responses, dynamic status messages, or important notifications that are not single-use static UI labels. This promotes consistency.
   - **Configurable/Changeable Text**: Strings that are likely to be modified by server owners (though direct modification of `textDatabase.js` is for devs) or are tied to configurable features **SHOULD** be included.
   - **Common Error Messages**: Standard error messages displayed to users **SHOULD** be in `textDatabase.js`.
   - **Placeholders**: Utilize placeholders like `{placeholderName}` within strings for dynamic content. These are resolved by `playerUtils.getString()`.
4. **When Local String Literals *Are Preferred* (Exclusion Criteria from `textDatabase.js` for UI)**:
   - **Highly Specific, Static, Single-Use UI Labels/Texts (Non-Panel Config)**: For very specific labels, titles, or descriptive texts within custom UI forms or elements not defined in `panelLayoutConfig.js` (e.g., complex modal dialogs created directly in `uiManager.js` or command files), if they are used only once and are static, these **SHOULD be hardcoded** directly within the UI building logic.
   - **Panel Configuration Texts (Titles, Buttons for Dynamic Panels)**: For UI panels whose structure, titles, and button texts are dynamically generated based on definitions in `AntiCheatsBP/scripts/core/panelLayoutConfig.js` (e.g., `!panel` UI), these display strings are defined directly within that configuration file and are not stored in `textDatabase.js`.
   - **Internal Constants/Logging Strings (Not User-Facing)**: String constants used purely for internal logic, non-standardized debug messages, or very specific non-user-facing log details do not need to be in `textDatabase.js`. Standardized error codes and user-facing components of log messages (if any) should still consider it.
   - **Developer-Facing Comments and Documentation**: JSDoc, inline comments, etc., are not part of `textDatabase.js`.
5. **Review and Refactoring**:
   - Periodically review `textDatabase.js` for strings that might no longer be used or could be better defined locally.
   - A dedicated task should be maintained in `Dev/tasks/todo.md` to audit existing entries against these guidelines, particularly focusing on potentially single-use strings that could be localized within their respective modules if they don't meet the criteria for central management (e.g., not reused, not configurable, not critical for overall message consistency).

## 8. Future Considerations

- **Automated Formatting:** While manual adherence to formatting is expected, the project may consider adopting an automated code formatter like Prettier in the future to ensure uniform style and reduce review overhead.

These guidelines will be applied iteratively across the codebase.
