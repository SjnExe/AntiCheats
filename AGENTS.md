# Agent Instructions for AntiCheats Addon Development

Welcome, AI Assistant (Jules)! This document provides specific guidelines and tips for working effectively on the AntiCheats Addon codebase. Please adhere to these instructions in addition to your general knowledge and the user's direct requests.

## 1. Core Objective
Your primary goal is to assist users by completing coding tasks, such as solving bugs, implementing features, writing tests, and updating documentation, all while maintaining code quality, consistency, and adhering to project conventions.

## 2. Understanding the Codebase
Before implementing changes, strive to understand the relevant parts of the codebase. Key architectural information can be found in `Dev/README.md`. Pay attention to:
*   **Core Managers (`AntiCheatsBP/scripts/core/`):** Understand how modules like `playerDataManager.js`, `actionManager.js`, `commandManager.js`, and `automodManager.js` interact.
*   **Configuration Files:**
    *   `AntiCheatsBP/scripts/config.js`: Main settings, feature toggles, command aliases.
    *   `AntiCheatsBP/scripts/core/actionProfiles.js`: Defines immediate consequences for cheat detections.
    *   `AntiCheatsBP/scripts/core/automodConfig.js`: Defines escalating automated actions based on flag counts.
*   **Coding Conventions:** Strictly follow guidelines in `Dev/CodingStyle.md` and `Dev/StandardizationGuidelines.md`.
*   **Naming Conventions are CRITICAL:**
    *   **`checkType`**: Identifiers used in check scripts, `actionProfiles.js` (as keys), and `automodConfig.js` (as keys) **MUST be `camelCase`**. This is essential for linking detections to actions. (e.g., `movementFlyHover`, `playerAntiGmc`).
    *   **`actionType`**: String literals for actions (e.g., in `automodConfig.js` rules or `actionProfiles.js` log types) **MUST be `camelCase`**. (e.g., `warn`, `kick`, `tempBan`, `detectedFlyHover`).
    *   Most other JavaScript identifiers (variables, functions, config keys) also follow `camelCase`.

## 3. Workflow and Task Management
This project uses a simple task management system in the `Dev/tasks/` directory.

*   **Before Starting New Work:**
    *   Review `Dev/tasks/ongoing.md` to see if any tasks are in progress.
    *   Review `Dev/tasks/todo.md` for planned tasks.
*   **Working on a Task:**
    *   If continuing a previous task, ensure `Dev/tasks/ongoing.md` reflects this.
    *   When starting a new task (usually from `Dev/tasks/todo.md` or a new user request):
        *   **Update `Dev/tasks/ongoing.md`**: Describe the task you are about to work on, including its objectives and your name/session identifier.
        *   If the task was from `Dev/tasks/todo.md`, remove it from there.
*   **Completing a Task:**
    *   Upon successful completion and submission of all changes for a task:
        *   **Update `Dev/tasks/completed.md`**: Add a summary of the completed task, including the work done and a reference to the submission (e.g., branch name or commit message theme).
        *   **Clear/Update `Dev/tasks/ongoing.md`**: If no immediate follow-up task, clear it to indicate no task is ongoing. If starting another task, update it for the new task.
*   **Identifying New Work:**
    *   If you identify potential future work, bugs, or ideas during your session, add them as new items to `Dev/tasks/todo.md` with a suggested priority if possible.

## 4. Documentation Responsibilities
*   **Update Root `README.md`**: If you add significant new user-facing features or make major changes to the addon's functionality or setup, you **must** also update the main project `README.md` (located in the repository root) to reflect these changes. This keeps the primary user documentation current.
*   **Update `Docs/` Folder**: For substantial feature changes or additions, relevant files in the `Docs/` folder (e.g., `FeaturesOverview.md`, `ConfigurationGuide.md`, `Commands.md`) should also be updated.
*   **JSDoc Comments**: Adhere to the JSDoc standards outlined in `Dev/StandardizationGuidelines.md`. Add JSDoc comments for new functions (especially exported ones) and complex logic. Ensure `@param` and `@returns` types are accurate, referencing `types.js` where appropriate.

## 5. Code Style and Quality
*   **Adherence to Guidelines:** Strictly follow `Dev/CodingStyle.md` and `Dev/StandardizationGuidelines.md`.
*   **Plain JavaScript:** All Behavior Pack scripts are written in plain JavaScript. Do not use TypeScript syntax.
*   **Error Handling:** Implement robust error handling (e.g., `try...catch` blocks for risky operations, validation of inputs).
*   **Logging:** Utilize `playerUtils.debugLog()` for development/debug messages (conditional on `config.enableDebugLogging` or `pData.isWatched`) and `logManager.addLog()` for persistent action/error logging.
*   **User-Facing Text:** All user-facing strings (UI, command responses) should be managed via `AntiCheatsBP/scripts/core/textDatabase.js` and retrieved using `getString()`.
*   **Linting with ESLint:** This project uses ESLint to enforce code style and catch potential errors.
    *   The configuration (`eslint.config.js`) is based on `eslint:recommended` rules plus specific project style guidelines from `Dev/CodingStyle.md` and `Dev/StandardizationGuidelines.md`.
    *   Run `npm run lint` to check for linting issues.
    *   Run `npm run lint:fix` to automatically fix many common issues.
    *   Please ensure your changes pass linting before submitting.
    *   *Note:* JSDoc specific linting rules via `eslint-plugin-jsdoc` were attempted but deferred due to environmental constraints with ESLint's flat configuration loader in the development environment. Core JSDoc formatting guidelines in `Dev/StandardizationGuidelines.md` should still be followed.

## 6. Planning and Communication
*   **Use `set_plan()`:** Always articulate your plan using the `set_plan` tool before starting significant code changes.
*   **Be Clear:** Make your plan steps clear and actionable.
*   **Ask Questions:** If the user's request is ambiguous or if you encounter significant issues, use `request_user_input`.
*   **Report Progress:** Use `plan_step_complete()` after each step.

By following these guidelines, you will help ensure the continued quality, consistency, and maintainability of the AntiCheats Addon. Thank you!
