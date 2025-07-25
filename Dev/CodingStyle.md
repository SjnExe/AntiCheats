# Coding Style Guidelines

This document outlines coding style conventions to be followed for this project to ensure consistency and readability.

## Naming Conventions

*All JavaScript identifiers (variables, function names, object properties, etc.) should generally use **`camelCase`**. This is now also enforced by ESLint where applicable.*

### Configuration Variables (`AntiCheatsBP/scripts/config.js`)

- Configuration variables exported from `config.js` should use **`camelCase`** (e.g., `exampleConfigValue`, `maxAllowedSpeed`).
- This applies to all new and refactored configuration constants.

### General Variables & Object Properties

- Local variables, function parameters, and object properties should use **`camelCase`** (e.g., `let myVariable = ...; function doSomething(someParameter) {}; const obj = { myProperty: value };`).

### Functions

- Function names should use **`camelCase`** (e.g., `function myFunction() {}`).

### Classes (if any used in the future)

- Class names should use **`PascalCase`** (e.g., `class MyClass {}`).

### Constants (outside of `config.js` exports)

- For any constants defined within files (not intended for external configuration via `config.js`), also use **`camelCase`** (e.g., `const maxRetries = 3;`). Avoid using `UPPER_SNAKE_CASE` to maintain consistency. If a value is truly global and fixed, it should ideally still be exposed via `config.js` using `camelCase`.

### Acronyms in Code (Variables/Functions/Properties):

- Acronyms within JavaScript `camelCase` identifiers should follow standard camel casing rules (e.g., `enableAntiGmcCheck`, `tpaManager`, `playerData.tpsInfo`). This enhances consistency.
- Example: `enableAntiGmcCheck`, `playerGmsStatus` are preferred over `enableAntiGMCCheck` or `playerGMSStatus`.

## Command System Conventions

### Command Prefixes

- Commands should be directly accessible via the configured `prefix` (e.g., `!`, as defined in `config.js`).
- The previous convention of using `!ac <command>` is deprecated. Commands should now be, for example, `!ban`, `!kick`, `!panel`.

### Command Naming

- Main command names should be descriptive and clear (e.g., `ban`, `kick`, `mute`, `inspect`).
- Avoid overly short or cryptic main command names. Aliases are preferred for brevity.
- User-facing commands (e.g., those typed in chat like `!gmc`, `!help`) should remain in their existing lowercase format.

### Command Aliases

- Most new commands should consider having a short, convenient alias.
- Command aliases are now defined directly within each command's definition object (typically in `AntiCheatsBP/scripts/commands/yourcommand.js`) under an `aliases` array (e.g., `aliases: ['alias1', 'alias2']`).
- The `commandManager.js` processes these aliases, resolving them to the main command name.
- Aliases should be unique and not conflict with other aliases or main command names.

### `checkType` String Identifiers

- `checkType` string identifiers (used in check scripts, `actionProfiles.js`, `automodConfig.js`) should use **`camelCase`**.
- Acronyms within these identifiers should also follow standard camel casing (e.g., `playerAntiGmc`, `chatTpaRequest`).
- Examples: `movementFlyHover`, `playerAntiGmc`, `worldIllegalItemPlace`.

### `actionType` String Literals

String literals used for `actionType` values (e.g., in `automodConfig.js` for AutoMod rule actions, and for `log.actionType` in `actionProfiles.js` for log categorization) should use **`camelCase`**.

- Examples for AutoMod rule actions: `warn`, `kick`, `tempBan`, `mute`, `flagOnly`, `teleportSafe`.
- Examples for `log.actionType` in action profiles: `detectedFlyHover`, `antigriefTntPlacement`, `detectedSpeedGround`.

## JSDoc and Magic Numbers (Linting Rules)

**JSDoc and magic number linting rules are explicitly disabled in this project and should not be re-enabled.**

### JSDoc

- While JSDoc can be useful, it is not enforced by the linter in this project.
- If you choose to use JSDoc, it should be as compact as possible, where single line comment should never use multi line comment style.
- Constants should not be used if they are not necessary.
- There should be no unnecessary comments or empty lines.

### Magic Numbers

- The `no-magic-numbers` linting rule is disabled.
- While it's good practice to avoid unexplained numbers in the code, this rule is often too strict and can lead to less readable code.

## General Formatting

- Follow existing code formatting for indentation (e.g., 4 spaces), spacing, and brace style.
- Aim for clarity and readability in code structure.
- Refer to `Dev/StandardizationGuidelines.md` for more detailed formatting rules.

## Debugging and Logging

### General Principles

- **Purpose:** Logging is crucial for diagnosing issues, understanding behavior, and aiding development. Strive to make logs clear, concise, and informative.
- **Performance:** Debug logging should have minimal to no impact on runtime performance when disabled. Expensive operations to gather data for logs (e.g., complex calculations, iterating large arrays, frequent `JSON.stringify` of large objects) MUST be conditional, typically enclosed within an `if (config.enableDebugLogging || (pData && pData.isWatched))` block or similar logic that checks if logging for that context is active.

### Using `debugLog`

- **Primary Tool:** The primary utility for debug logging is `debugLog(message, contextPlayerNameIfWatched, dependencies)` located in `utils/playerUtils.js`.
- **Output Destination:** `debugLog` uses `console.warn()`, which directs output to the server console and Minecraft's Content Log GUI. It should NOT be used for messages intended for player chat. For admin notifications, use `notifyAdmins()`. For direct warnings to players, use `warnPlayer()`.
- **Conditional Logging:** The `debugLog` function itself will only output if `dependencies.config.enableDebugLogging` is true.
- **Contextual Information:**
  - Always provide sufficient context in your log messages. Include relevant variable values, state indicators, function names, or event types.
  - For player-specific actions or checks, use the `contextPlayerNameIfWatched` parameter. If this parameter is provided, `debugLog` will use a prefix like `[AC Watch - PlayerName]` which helps in filtering and focusing on specific player activity.
  - Example: `playerUtils.debugLog(\`Player ${player.nameTag} failed fly check. Vertical speed: ${currentSpeedY}\`, player.nameTag, dependencies);`
- **Strategic Placement:**
  - Log entry and exit points for complex functions or event handlers, especially if they are critical paths.
  - Log key decisions, state changes, or the results of important calculations.
  - When a check or action is denied or fails, log the reason and the values that led to the failure.
- **Clarity over Brevity (when active):** When debugging is active, more information is generally better, as long as it's well-structured. Don't be afraid to log multiple related variables if it helps paint a full picture.

### Example of Performance-Conscious Logging

```javascript
// In a function that processes player data (pData) and has dependencies
if (dependencies.config.enableDebugLogging || (pData && pData.isWatched)) {
  // Expensive data gathering only happens if logging is active for this context
  const detailedStatus = someComplexFunctionToGetStringStatus(pData);
  const relevantEvents = pData.eventHistory.filter((event) => event.type === "critical").map((event) => event.id);

  playerUtils.debugLog(`Processing player ${pData.playerName}. Status: ${detailedStatus}. Critical Event IDs: ${JSON.stringify(relevantEvents)}.`, pData.playerName, dependencies);
}

// Or, if the debugLog call is already inside a conditional block checking for isWatched:
// (Inside a function where pData and dependencies are available, and isWatched has been checked)
// const someValue = potentiallyExpensiveCalculation();
// playerUtils.debugLog(`Some check for ${pData.playerName}: value is ${someValue}`, pData.playerName, dependencies);
// Consider if potentiallyExpensiveCalculation() itself needs to be conditional if it's very heavy.
```
