# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## Documentation Tasks
*Task moved to ongoing.md as part of a comprehensive review by Jules.*
- **(High) JSDoc Review**: Conduct a thorough pass over all `.js` files to ensure JSDoc comments are present, accurate, and use correct `@param` / `@returns` types, especially referencing `types.js` where appropriate. Ensure all core manager functions and check module functions are well-documented.

## Code Refinement & Feature Enhancements
- **(Low) Linter Integration**: Explore setting up ESLint with a shared configuration (e.g., based on `StandardizationGuidelines.md`) to automatically enforce code style and catch common errors. This would improve consistency, especially with multiple contributors.
- **(Medium) `worldBorderManager.js` Robustness**: Consider if `worldBorderManager.getBorderSettings` should be more robust if a dimension from `config.worldBorderKnownDimensions` is invalid or if the dynamic property for a specific dimension is corrupted.
- **(Low) `tpaManager.js` `generateRequestId()`**: The current UUID-like generator is simple. For higher collision resistance if many TPAs occur, evaluate if a more robust UUID method is needed (current is likely fine).
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
- **(Medium) Code Deduplication/Refactoring Pass**: Conduct a dedicated review of the codebase to identify and refactor repeated logic patterns or utility functions to improve maintainability and reduce redundancy.
- **(High) Enhanced Unit/Integration Testing**: Expand test coverage with more unit tests for individual functions/modules and integration tests for complex interactions between core systems (e.g., `actionManager`, `playerDataManager`, `automodManager`).
- **(Medium) Configuration File Validation**: Implement a robust validation system at startup for `config.js`, `core/actionProfiles.js`, `core/automodConfig.js`, and `core/ranksConfig.js` to check for correct data types, required fields, and logical consistency (e.g., valid `checkType` references). This would help prevent runtime errors due to misconfiguration.
- **(Low) Command and Configuration Schema Definition**: Define formal schemas (e.g., using JSON Schema or TypeScript interfaces if applicable) for command definitions, `config.js` structure, and other complex configuration objects. This can aid in validation, documentation, and potentially tooling.
- **(Low) Build/Tooling for Repetitive Code Generation**: For files with highly repetitive boilerplate (like `commandRegistry.js` or barrel files), explore using simple build scripts to auto-generate them, reducing manual effort and potential for errors.
- **(Medium) Performance Profiling**: Periodically profile performance-critical areas, such as frequently executed checks or operations within the main tick loop, to identify and address potential bottlenecks.
- **(Medium) Granular Permission System Exploration**: Evaluate if the current numeric permission levels are sufficient for all commands and features, or if a more granular, capability-based permission system (e.g., per-command permissions) would offer better flexibility.
- **(Low) Dynamic Language/Text Resource Loading**: Investigate options for loading text strings from `textDatabase.js` (or a similar structure) dynamically, potentially from external JSON files, to simplify community translations or text modifications without direct script editing.
