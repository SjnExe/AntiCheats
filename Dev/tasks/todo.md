# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## Documentation Tasks

## Linting & Code Style Tasks

## Code Refinement & Feature Enhancements

## New Feature Ideas (Examples - to be expanded by project owner)
- **(Medium) More advanced X-Ray detection methods (if feasible with Script API).**
- **(High) Webhook integration for critical alerts or logs.**

## README.md Asset Tasks
- **(Low) Add Project Logo/Banner to README.md**: Create and add a project logo/banner. (Context: `README.md:2`).
- **(Low) Add GIF/Screenshot for Cheat Detection to README.md**: Create and add a visual example of a cheat detection. (Context: `README.md:60`).
- **(Low) Add GIF/Screenshot for Admin Panel UI to README.md**: Create and add a visual of the `!panel` UI. (Context: `README.md:64`).
- **(Low) Add GIF/Screenshot for World Border to README.md**: Create and add a visual of the World Border feature. (Context: `README.md:75`).

## General Code & System Improvements (Suggestions by Jules)

### Core Systems & Data Management
- **(Complete) Async Operations & `pData` Staleness**:
    - Conducted a codebase search for areas where `pData` is used after an `await` call.
    - **Action Taken**: Applied `pData` re-fetching pattern (get `pData` again via `playerDataManager.getPlayerData(player.id)` and check `player.isValid()` + `pData` validity) in several key async functions in `AntiCheatsBP/scripts/core/eventHandlers.js` (specifically in `_handlePlayerLeave`, `_handlePlayerSpawn`'s timeout, `_handleEntitySpawnEventAntiGrief`'s loop, `_handlePlayerBreakBlockBeforeEvent`, `_handlePlayerBreakBlockAfterEvent`, `_handlePlayerDimensionChangeAfterEvent`) and in `AntiCheatsBP/scripts/core/actionManager.js` (in `executeCheckAction` after `await addFlag`). This enhances data integrity by mitigating risks of using stale `pData` references after asynchronous operations.
- **(Low) Standardized Error Object/Logging for `logManager`**:
    - For errors logged via `logManager.addLog`, consider a more standardized structure for the `details` object, perhaps including a common `errorCode` string or a more consistent `errorContext` for easier filtering and analysis of system errors.
- **(Low) `currentTick` Dependency Consistency**:
    - Review usage of `currentTick`. Some functions receive it directly, others from `dependencies.currentTick`. Standardize on `dependencies.currentTick` where feasible unless a specific tick from an event is required.
- **(Medium) `commandManager.js` Alias Handling in `initializeCommands`**:
    - The IIFE comment in `commandManager.js` regarding `config.commandAliases` needs updating to reflect that aliases are now sourced from command definitions.
    - Ensure `dependencies.aliasToCommandMap` is the single source of truth for alias resolution during command handling and for other modules like `help.js`.

### Checks Implementation
- **(Medium) `flyCheck.js` - Grace Conditions & Slow Fall**:
    - Evaluate `yVelocityGraceTicks` for knockback scenarios.
    - Refine hover check logic for players with `hasSlowFalling` to ensure it correctly distinguishes between legitimate bobbing and "Float" hacks, especially if the player is ascending or stationary with slow fall.
- **(Low) `reachCheck.js` - Hitbox Approximation**:
    - Document that the hitbox adjustment is an approximation. While raycasting is expensive, note this as a potential area for future precision improvement if performance allows or if specific false positives due to entity size variations become problematic.
- **(Low) `antiGmcCheck.js` - Dependency Reliability**:
    - Note that its accuracy depends on reliable `rankManager.getPlayerPermissionLevel` and `permissionLevels` configuration.
- **(Medium) `nukerCheck.js` - False Positive Review**:
    - Review thresholds (`nukerMaxBreaksShortInterval`, `nukerCheckIntervalMs`) against legitimate fast mining with high-efficiency tools and effects (e.g., Haste II + Eff V) or instant mining of sculk-like blocks.
- **(High) General Check `pData` Reliance**:
    - Emphasize in developer documentation that all checks' accuracy heavily relies on `pData` being accurate and timely. Errors in `pData` updates can cascade into check malfunctions.

### Commands Implementation
- **(Low) `help.js` - Alias Resolution**:
    - Update `help.js` to use `dependencies.aliasToCommandMap` (populated by `commandManager`) for resolving aliases to main command names, instead of potentially checking `config.commandAliases` or other outdated methods. This ensures consistency with `commandManager`.
- **(Low) Programmatic Command Invocation**:
    - Review if commands other than `ban.js` might be invoked programmatically (e.g., by AutoMod or other systems). If so, ensure they have appropriate parameters (like `invokedBy`, `isAutoModAction`) and logic to handle different invocation contexts for feedback and logging.

### Utility Functions
- **(Low) `playerUtils.js` - `parseDuration` Flexibility**:
    - Consider if additional time units (e.g., 'w' for weeks) are needed for `parseDuration`. If so, update the regex and logic.
- **(High) `itemUtils.js` - Accuracy and Maintenance**:
    - Document clearly that `itemUtils.js` (especially `getExpectedBreakTicks` and `calculateRelativeBlockBreakingPower`) is a server-side approximation of complex client-side game mechanics.
    - Schedule periodic reviews of its internal data maps (`blockHardnessMap`, etc.) and constants against Minecraft updates to maintain reasonable accuracy.
    - Highlight that this utility is a primary candidate for issues if Minecraft changes block breaking mechanics.

### Configuration Files & Data Structures
- **(Low) `config.js` - `updateConfigValue` Type Coercion**:
    - For `updateConfigValue`, document that complex object/array updates are full replacements if parsed from JSON. If partial updates or more sophisticated validation for nested structures are ever needed, this function would require significant enhancement.
- **(Medium) `actionProfiles.js` & `automodConfig.js` - `camelCase` Enforcement**:
    - Perform a manual review or add a linting rule (if possible for JSON-like structures in JS) to strictly enforce `camelCase` for all `checkType` keys, `flag.type` values, `log.actionType` values, and `actionType` parameters within these files, as per documentation and `AGENTS.md`.
- **(Low) `textDatabase.js` - Maintainability**:
    - As the addon grows, consider if further sub-grouping of keys within `stringDB` (e.g., `ui.adminPanel.buttons.viewPlayers`) would improve organization if the file becomes excessively large.
- **(Medium) `types.js` - `PlayerAntiCheatData` Review**:
    - Schedule periodic reviews of the `PlayerAntiCheatData` typedef to remove obsolete properties and ensure all current properties are accurately documented and handled in `playerDataManager.js` (initialization, persistence, updates).

### Broader Code Quality & Maintainability
- **(Medium) Logging Consistency**:
    - Review codebase for consistency in logging:
        - What level of detail goes to `console.warn` (via `debugLog`) vs. `logManager.addLog`.
        - Standardize prefixes or context markers for `debugLog` if not using `contextPlayerNameIfWatched`.
- **(Medium) Error Handling Standardization**:
    - Evaluate creating a more standardized error reporting utility or pattern, especially for errors reported to `logManager`. This could include common error codes or more structured `details` objects.
- **(Low) JSDoc `@module` Tags**:
    - Ensure all files that are intended to be modules have a `@module path/to/module` tag for better documentation generation and clarity, if not already present.
- **(Low) AGENTS.md - JSDoc Linting Update**:
    - Update `AGENTS.md` section on ESLint/JSDoc if the "environmental constraints" for `eslint-plugin-jsdoc` are resolved, or if a decision is made to enforce more JSDoc rules via ESLint.
- **(Low) Task Management Files in `Dev/tasks/`**:
    - Ensure `AGENTS.md` instructions for AI to update `ongoing.md`, `completed.md`, and `todo.md` are clear and consistently followed. Add a note for human devs to also follow this if collaborating.
