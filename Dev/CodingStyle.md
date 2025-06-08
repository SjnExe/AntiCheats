# Coding Style Guidelines

This document outlines coding style conventions to be followed for this project to ensure consistency and readability.

## Naming Conventions

### Configuration Variables (`AntiCheatsBP/scripts/config.js`)
*   Configuration variables exported from `config.js` should use **`camelCase`** (e.g., `exampleConfigValue`, `maxAllowedSpeed`).
*   This applies to all new and refactored configuration constants.

### General Variables
*   Local variables and function parameters should use **`camelCase`** (e.g., `let myVariable = ...; function doSomething(someParameter) {}`).

### Functions
*   Function names should use **`camelCase`** (e.g., `function myFunction() {}`).

### Classes (if any used in the future)
*   Class names should use **`PascalCase`** (e.g., `class MyClass {}`).

### Constants (outside of `config.js` exports)
*   For any constants defined within files (not intended for external configuration via `config.js`), also use **`camelCase`** (e.g., `const maxRetries = 3;`). Avoid using `UPPER_SNAKE_CASE` to maintain consistency. If a value is truly global and fixed, it should ideally still be exposed via `config.js` using `camelCase`.

### Acronyms in Code (Variables/Functions):
*   Acronyms within JavaScript variable and function names should generally be preserved in their original uppercase form if they represent specific, well-known abbreviations. For example, 'GMC' (for Game Mode Creative), 'GMS' (Game Mode Survival), 'GMSP' (Game Mode Spectator), 'GMA' (Game Mode Adventure) should be written as `enableAntiGMCCheck`, `playerGMSStatus`, etc., rather than `enableAntiGmcCheck` or `playerGmsStatus`. This enhances readability and aligns with common project-specific terminology. When in doubt, prefer uppercase for established project acronyms.

### Command Naming:
*   User-facing commands (e.g., those typed in chat like `!gmc`, `!help`) should remain in their existing lowercase format. The uppercase acronym convention described for JavaScript variables and functions does not apply to these command identifiers.

## JSDoc
*   Use JSDoc comments for all functions, especially exported ones, detailing their purpose, parameters, and return values.
*   Use JSDoc typedefs for complex object structures (e.g., `PlayerAntiCheatData`) and consider placing these in a central `types.js` file in the future to avoid circular dependencies.

## General Formatting
*   Follow existing code formatting for indentation (e.g., 4 spaces), spacing, and brace style.
*   Aim for clarity and readability in code structure.

## Debugging and Logging
### General Principles
- **Purpose:** Logging is crucial for diagnosing issues, understanding behavior, and aiding development. Strive to make logs clear, concise, and informative.
- **Performance:** Debug logging should have minimal to no impact on runtime performance when disabled. Expensive operations to gather data for logs (e.g., complex calculations, iterating large arrays, frequent `JSON.stringify` of large objects) MUST be conditional, typically enclosed within an `if (enableDebugLogging || (pData && pData.isWatched))` block or similar logic that checks if logging for that context is active.

### Using `debugLog`
- **Primary Tool:** The primary utility for debug logging is `debugLog(message, contextPlayerNameIfWatched)` located in `utils/playerUtils.js`.
- **Output Destination:** `debugLog` uses `console.warn()`, which directs output to the server console and Minecraft's Content Log GUI. It should NOT be used for messages intended for player chat. For admin notifications, use `notifyAdmins()`. For direct warnings to players, use `warnPlayer()`.
- **Conditional Logging:** The `debugLog` function itself will only output if `enableDebugLogging` is true in `config.js`.
- **Contextual Information:**
    - Always provide sufficient context in your log messages. Include relevant variable values, state indicators, function names, or event types.
    - For player-specific actions or checks, use the `contextPlayerNameIfWatched` parameter. If this parameter is provided, `debugLog` will use a prefix like `[AC Watch - PlayerName]` which helps in filtering and focusing on specific player activity.
    - Example: `debugLog(\`Player ${player.nameTag} failed fly check. Vertical speed: ${currentSpeedY}\`, player.nameTag);`
- **Strategic Placement:**
    - Log entry and exit points for complex functions or event handlers, especially if they are critical paths.
    - Log key decisions, state changes, or the results of important calculations.
    - When a check or action is denied or fails, log the reason and the values that led to the failure.
- **Clarity over Brevity (when active):** When debugging is active, more information is generally better, as long as it's well-structured. Don't be afraid to log multiple related variables if it helps paint a full picture.

### Example of Performance-Conscious Logging

```javascript
// In a function that processes player data (pData)
if (enableDebugLogging || (pData && pData.isWatched)) {
    // Expensive data gathering only happens if logging is active for this context
    const detailedStatus = someComplexFunctionToGetStringStatus(pData);
    const relevantEvents = pData.eventHistory.filter(event => event.type === 'critical').map(event => event.id);

    debugLog(`Processing player ${pData.playerName}. Status: ${detailedStatus}. Critical Event IDs: ${JSON.stringify(relevantEvents)}.`, pData.playerName);
}

// Or, if the debugLog call is already inside a conditional block checking for isWatched:
// (Inside a function where pData is available and isWatched has been checked)
// const someValue = potentiallyExpensiveCalculation();
// debugLog(`Some check for ${pData.playerName}: value is ${someValue}`, pData.playerName);
// Consider if potentiallyExpensiveCalculation() itself needs to be conditional if it's very heavy.
```
