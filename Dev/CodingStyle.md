# Coding Style Guidelines

This document outlines coding style conventions to be followed for this project to ensure consistency, readability, and maintainability. Adherence to these guidelines is expected for all contributions.

## Naming Conventions

The general rule for all project-specific JavaScript identifiers (variables, function names, object properties, etc.) is to use **`camelCase`**. This is enforced by ESLint where applicable.

### Internal ("Private") Members

- To signify that a function or a module-level variable is intended for internal use within that module only (i.e., it is not exported), it **MUST** be prefixed with a leading underscore (`_`).
- This is a convention to communicate intent; it does not provide true privacy.
- **Example:** `function _internalHelper() { ... }`, `const _moduleConstant = 10;`

### Configuration Variables (`AntiCheatsBP/scripts/config.js`)

- All configuration variables exported from `config.js` **MUST** use `camelCase` (e.g., `exampleConfigValue`, `maxAllowedSpeed`).

### General Variables & Object Properties

- Local variables, function parameters, and object properties **MUST** use `camelCase`.
- **Example:** `let myVariable = ...; function doSomething(someParameter) {}; const obj = { myProperty: value };`

### Functions

- All exported and local function names **MUST** use `camelCase`.
- For internal-only helper functions, see the **Internal ("Private") Members** section above.
- **Example:** `function myFunction() {}`

### Classes

- While not currently in use, any future classes **MUST** use `PascalCase`.
- **Example:** `class MyClass {}`

### Constants

- All constants, whether exported from `config.js` or defined locally within a file, **MUST** use `camelCase`.
- The use of `UPPER_SNAKE_CASE` is disallowed to maintain a consistent style across the codebase.
- **Example:** `const maxRetries = 3;`

### Acronyms in Code

- Acronyms within `camelCase` identifiers **SHOULD** follow standard camel casing rules to enhance consistency.
- **Example:** `enableAntiGmcCheck`, `tpaManager` are preferred over `enableAntiGMCCheck`.

### Exception for Minecraft Identifiers

- When interacting with native Minecraft APIs, it is necessary to use the case style defined by the game itself.
- Many Minecraft identifiers (e.g., item IDs, entity type IDs, effect types) use **`snake_case`**.
- When using these identifiers as string literals, their original `snake_case` format **MUST** be preserved.
- **Example:** `player.addEffect('slow_falling', ...)` is correct; `player.addEffect('slowFalling', ...)` would fail.

## Command System Conventions

### Command Naming

- User-facing commands typed in chat **MUST** be lowercase (e.g., `!gmc`, `!help`).
- The internal registration name of a command (in its definition file) **SHOULD** be descriptive and clear (e.g., `ban`, `kick`, `mute`).

### `checkType` and `actionType` String Identifiers

- `checkType` identifiers (used to link detections to actions) **MUST** be `camelCase`.
  - **Examples:** `movementFlyHover`, `playerAntiGmc`, `worldIllegalItemPlace`.
- `actionType` identifiers (used for logging and defining AutoMod rule actions) **MUST** be `camelCase`.
  - **Examples (AutoMod):** `warn`, `kick`, `tempBan`.
  - **Examples (Logging):** `detectedFlyHover`, `antigriefTntPlacement`.

## JSDoc and Comments

- **JSDoc:** The `require-jsdoc` linting rule is disabled. However, if you choose to write JSDoc comments, you **SHOULD** follow a compact style. Multi-line comments (`/** ... */`) should only be used when necessary.
- **Clarity:** There should be no unnecessary comments or empty lines. Code should be as self-documenting as possible.

## General Formatting

- **Indentation:** Use 4 spaces for indentation.
- **Brace Style:** Follow the existing brace style (One True Brace Style).
- **Readability:** Aim for clarity and readability in all code.
- For more detailed rules, refer to `Dev/StandardizationGuidelines.md`.

## Logging

- **Purpose:** Logging is crucial for diagnosing issues and understanding behavior. Logs **SHOULD** be clear, concise, and informative.
- **Performance:** Expensive operations to gather data for logs **MUST** be conditional on a check like `if (config.enableDebugLogging || pData?.isWatched)`.
- **Tooling:**
  - Use `playerUtils.debugLog()` for development messages.
  - Use `logManager.addLog()` for persistent, structured action and error logging.
  - Use `playerUtils.notifyAdmins()` for important real-time notifications to staff.
  - Use `playerUtils.warnPlayer()` for direct warnings to players.
- For detailed implementation, see the **Debugging and Logging** section in the main `README.md` or `AGENTS.md`.
