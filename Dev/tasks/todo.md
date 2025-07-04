# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## Documentation Tasks
- **(High) JSDoc Review**: Conduct a thorough pass over all `.js` files to ensure JSDoc comments are present, accurate, and use correct `@param` / `@returns` types, especially referencing `types.js` where appropriate. Ensure all core manager functions and check module functions are well-documented.

## Code Refinement & Feature Enhancements
- **(Low) Linter Integration**: Explore setting up ESLint with a shared configuration (e.g., based on `StandardizationGuidelines.md`) to automatically enforce code style and catch common errors. This would improve consistency, especially with multiple contributors.
- **(Medium) `worldBorderManager.js` Robustness**: Consider if `worldBorderManager.getBorderSettings` should be more robust if a dimension from `config.worldBorderKnownDimensions` is invalid or if the dynamic property for a specific dimension is corrupted.
- **(Low) `tpaManager.js` `generateRequestId()`**: The current UUID-like generator is simple. For higher collision resistance if many TPAs occur, evaluate if a more robust UUID method is needed (current is likely fine).
- **(Medium) Offline Player Flag Purging (`purgeflags` command)**: Implement the functionality to purge flags for offline players, likely by directly modifying their persisted data in dynamic properties. (Context: `AntiCheatsBP/scripts/commands/purgeflags.js:31`).
- **(Low) `uiManager.js` `formatDimensionName()`**: This helper is useful. Ensure it covers all standard Minecraft dimension IDs gracefully. Consider moving it to `playerUtils.js` or a new `worldUtils.js` if used elsewhere or if `playerUtils.js` becomes too large.
- **(Low) `playerDataManager.js` `isDirtyForSave` Optimization**: Evaluate if frequently updated transient fields (e.g., `lastGameMode`, `lastDimensionId`) should trigger `isDirtyForSave = true` if they are the *only* changes, to potentially optimize save frequency.
- **(Low) Review `main.js` API Readiness Checks**: As the Script API evolves, ensure `checkEventAPIsReady` in `main.js` remains relevant or adapts to new API stability patterns.

## New Feature Ideas (Examples - to be expanded by project owner)
- **(Medium) More advanced X-Ray detection methods (if feasible with Script API).**
- **(High) Webhook integration for critical alerts or logs.**

## README.md Asset Tasks
- **(Low) Add Project Logo/Banner to README.md**: Create and add a project logo/banner. (Context: `README.md:2`).
- **(Low) Add GIF/Screenshot for Cheat Detection to README.md**: Create and add a visual example of a cheat detection. (Context: `README.md:60`).
- **(Low) Add GIF/Screenshot for Admin Panel UI to README.md**: Create and add a visual of the `!panel` UI. (Context: `README.md:64`).
- **(Low) Add GIF/Screenshot for World Border to README.md**: Create and add a visual of the World Border feature. (Context: `README.md:75`).
