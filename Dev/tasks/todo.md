# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## Documentation Tasks
- **(High) JSDoc Review**: Conduct a thorough pass over all `.js` files to ensure JSDoc comments are present, accurate, and use correct `@param` / `@returns` types, especially referencing `types.js` where appropriate. Ensure all core manager functions and check module functions are well-documented.

## Linting & Code Style Tasks
- **(Medium) Apply Updated Linting Rules**: After the ESLint configuration is updated, run `npm run lint:fix` (or similar) across the entire codebase to apply the new rules and formatting. Manually address any issues that cannot be auto-fixed. (This is a placeholder for a subsequent task).

## Code Refinement & Feature Enhancements
- **(Medium) `worldBorderManager.js` Robustness**: Consider if `worldBorderManager.getBorderSettings` should be more robust if a dimension from `config.worldBorderKnownDimensions` is invalid or if the dynamic property for a specific dimension is corrupted.
- **(Medium) Offline Player Flag Purging (`purgeflags` command)**: Implement the functionality to purge flags for offline players, likely by directly modifying their persisted data in dynamic properties. (Context: `AntiCheatsBP/scripts/commands/purgeflags.js:31`).

## New Feature Ideas (Examples - to be expanded by project owner)
- **(Medium) More advanced X-Ray detection methods (if feasible with Script API).**
- **(High) Webhook integration for critical alerts or logs.**

## README.md Asset Tasks
- **(Low) Add Project Logo/Banner to README.md**: Create and add a project logo/banner. (Context: `README.md:2`).
- **(Low) Add GIF/Screenshot for Cheat Detection to README.md**: Create and add a visual example of a cheat detection. (Context: `README.md:60`).
- **(Low) Add GIF/Screenshot for Admin Panel UI to README.md**: Create and add a visual of the `!panel` UI. (Context: `README.md:64`).
- **(Low) Add GIF/Screenshot for World Border to README.md**: Create and add a visual of the World Border feature. (Context: `README.md:75`).

## General Code & System Improvements (Suggestions by Jules)
- **(Low) Build/Tooling for Repetitive Code Generation**: For files with highly repetitive boilerplate (like `commandRegistry.js` or barrel files), explore using simple build scripts to auto-generate them, reducing manual effort and potential for errors.
- **(Low) Dynamic Language/Text Resource Loading**: Investigate options for loading text strings from `textDatabase.js` (or a similar structure) dynamically, potentially from external JSON files, to simplify community translations or text modifications without direct script editing.
