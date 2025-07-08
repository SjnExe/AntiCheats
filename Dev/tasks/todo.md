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
- **(Low) Refactor `textDatabase.js` Content**:
    - Review existing strings in `stringDB` against new usage guidelines (see `Dev/StandardizationGuidelines.md`).
    - Identify single-use, static strings that could be moved to their respective local modules.
    - Implement refactoring for identified strings to improve `textDatabase.js` focus and maintainability.

### Broader Code Quality & Maintainability
