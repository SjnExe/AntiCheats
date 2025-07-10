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

### Configuration Files & Data Structures
<!-- Placeholder for future tasks -->
- **(Medium) Enhance Configuration Editing UI (uiManager.js):** Modify `showConfigCategoriesListImpl` to dynamically discover editable config keys from `config.js` (e.g., based on metadata or type) instead of using a hardcoded list. Investigate options for safely editing simple array types if feasible.

## Hierarchical Panel System Enhancements (Post-Refactor)
- **(High) Thorough Testing of All Panel Flows, Permissions, and Sorting:**
    - Systematically test every panel and button with various permission levels for correct visibility, sorting, navigation, action execution, and error handling.
- **(Medium) Error Handling and User Feedback in Panels:**
    - Ensure all panel actions provide clear, user-friendly feedback (success, failure, invalid input) and that error states allow graceful recovery or return to a safe panel state.
