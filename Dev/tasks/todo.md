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

## Hierarchical Panel System Enhancements (Post-Refactor)
- **(High) Complete All Leaf Action Functions in `UI_ACTION_FUNCTIONS` (`uiManager.js`):**
    - Fully implement forms and logic for: kicking, muting, teleport actions, configuration editing, chat/lag clearing confirmations, log viewing, detailed flag display, and other admin actions defined in `panelLayoutConfig.js` that are currently placeholders.
- **(Medium) Refine User Info Panel Sub-Panel Content Display & Interaction:**
    - Evaluate if `showMyStatsPageContent`, `showServerRulesPageContent`, `showHelpfulLinksPageContent`, `showGeneralTipsPageContent` (currently simple modals) should become full panels defined in `panelLayoutConfig.js` (e.g., `helpfulLinksPanel` listing links as clickable buttons).
    - This may involve changing `actionType: 'functionCall'` to `actionType: 'openPanel'` for some items in `mainUserPanel`.
- **(Medium) Dynamic Button Text/Icon Updates in `showPanel` (Enhancement):**
    - Implement support in `showPanel` and `panelLayoutConfig.js` for button text/icons that change dynamically based on context (e.g., "Freeze Player" vs "Unfreeze Player").
- **(Medium) Context Passing and Management Refinement:**
    - Thoroughly test and refine context passing (`actionContextVars`, `initialContext`) for all multi-level panel navigation and action calls.
- **(Low) `showOnlinePlayersList` and other List-Displaying Functions Refinement:**
    - Consider converting list-based forms (like `showOnlinePlayersList`) into panel definitions in `panelLayoutConfig.js` with dynamically generated items for better consistency with the `showPanel` system.
    - Ensure robust "Back" button logic from these forms.
- **(High) Thorough Testing of All Panel Flows, Permissions, and Sorting:**
    - Systematically test every panel and button with various permission levels for correct visibility, sorting, navigation, action execution, and error handling.
- **(Medium) Review and Complete All Stubbed/TODO Functions in `uiManager.js`:**
    - Address any remaining `// TODO:` comments or placeholder/stubbed functions in `uiManager.js` not covered by the panel system refactor or leaf function implementation.
- **(Medium) Error Handling and User Feedback in Panels:**
    - Ensure all panel actions provide clear, user-friendly feedback (success, failure, invalid input) and that error states allow graceful recovery or return to a safe panel state.
