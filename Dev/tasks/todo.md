# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## New Feature Ideas (Examples - to be expanded by project owner)
- **(Medium) More advanced X-Ray detection methods (if feasible with Script API).**
- **(High) Webhook integration for critical alerts or logs.**

## README.md Asset Tasks
- **(Low) Add Project Logo/Banner to README.md**: Create and add a project logo/banner. (Context: `README.md:2`).
- **(Low) Add GIF/Screenshot for Cheat Detection to README.md**: Create and add a visual example of a cheat detection. (Context: `README.md:60`).
- **(Low) Add GIF/Screenshot for Admin Panel UI to README.md**: Create and add a visual of the `!panel` UI. (Context: `README.md:64`).
- **(Low) Add GIF/Screenshot for World Border to README.md**: Create and add a visual of the World Border feature. (Context: `README.md:75`).

## General Code & System Improvements (Suggestions by Jules)

### Checks Implementation
- **(Medium) `flyCheck.js` - Grace Conditions & Slow Fall**:
    - Evaluate `yVelocityGraceTicks` for knockback scenarios.
    - Refine hover check logic for players with `hasSlowFalling` to ensure it correctly distinguishes between legitimate bobbing and "Float" hacks, especially if the player is ascending or stationary with slow fall.
- **(Low) `reachCheck.js` - Hitbox Approximation**:
    - Document that the hitbox adjustment is an approximation. While raycasting is expensive, note this as a potential area for future precision improvement if performance allows or if specific false positives due to entity size variations become problematic.

### Configuration Files & Data Structures
- **(Low) Refactor `textDatabase.js` Content**:
    - Review existing strings in `stringDB` against new usage guidelines (see `Dev/StandardizationGuidelines.md`).
    - Identify single-use, static strings that could be moved to their respective local modules.
    - Implement refactoring for identified strings to improve `textDatabase.js` focus and maintainability.
