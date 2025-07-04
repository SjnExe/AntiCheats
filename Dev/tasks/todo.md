# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## Documentation Tasks
- **(High) JSDoc Review**: Conduct a thorough pass over all `.js` files to ensure JSDoc comments are present, accurate, and use correct `@param` / `@returns` types, especially referencing `types.js` where appropriate. Ensure all core manager functions and check module functions are well-documented.
- **(Low) AGENTS.md**: Consider creating an `AGENTS.md` in the root or `Dev/` directory to provide high-level instructions or tips for AI agents working on the codebase, if the AI section in `Dev/README.md` proves insufficient over time.

## Code Refinement & Feature Enhancements
- **(Low) Linter Integration**: Explore setting up ESLint with a shared configuration (e.g., based on `StandardizationGuidelines.md`) to automatically enforce code style and catch common errors. This would improve consistency, especially with multiple contributors.
- **(Low) `config.js` Structure**: The `editableConfigValues` object in `config.js` re-declares many constants. Investigate if there's a more DRY (Don't Repeat Yourself) way to manage this, perhaps by initializing `editableConfigValues` from the exported constants directly at startup.
- **(Medium) `worldBorderManager.js` Robustness**: Consider if `worldBorderManager.getBorderSettings` should be more robust if a dimension from `config.worldBorderKnownDimensions` is invalid or if the dynamic property for a specific dimension is corrupted.
- **(Low) `tpaManager.js` `generateRequestId()`**: The current UUID-like generator is simple. For higher collision resistance if many TPAs occur, evaluate if a more robust UUID method is needed (current is likely fine).
- **(Low) `uiManager.js` `formatDimensionName()`**: This helper is useful. Ensure it covers all standard Minecraft dimension IDs gracefully. Consider moving it to `playerUtils.js` or a new `worldUtils.js` if used elsewhere or if `playerUtils.js` becomes too large.
- **(Low) `playerDataManager.js` `isDirtyForSave` Optimization**: Evaluate if frequently updated transient fields (e.g., `lastGameMode`, `lastDimensionId`) should trigger `isDirtyForSave = true` if they are the *only* changes, to potentially optimize save frequency.
- **(Low) Review `main.js` API Readiness Checks**: As the Script API evolves, ensure `checkEventAPIsReady` in `main.js` remains relevant or adapts to new API stability patterns.
- **(Low) `playerDataManager.js` `initializeDefaultPlayerData` Flags**: The `allKnownFlagTypes` array is manually maintained. Consider if this could be dynamically generated from `actionProfiles.js` keys to improve consistency when adding new checks/flags.
- **(High) Comprehensive Review of `stringDB` keys**: Ensure all user-facing strings in UI and command responses are sourced from `textDatabase.js` via `getString()`. Add any missing strings and organize keys logically.
- **(Medium) Error Handling Granularity**: Review error logging (`logManager.addLog` with `actionType: 'error...'`) to ensure consistent and useful `context` and `details` are provided for different error types across modules.
- **(Medium) Admin Notification Review**: Review all `playerUtils.notifyAdmins` calls to ensure messages are informative and consistently formatted. Consider if some notifications should be configurable (on/off) via `config.js`.
- **(Low) Code Comments**: Review TODO/FIXME comments in the code and either address them or convert them into proper tasks in this `todo.md` file.

## New Feature Ideas (Examples - to be expanded by project owner)
- **(Low) Configurable sounds for notifications/actions.**
- **(Medium) More advanced X-Ray detection methods (if feasible with Script API).**
- **(High) Webhook integration for critical alerts or logs.**
