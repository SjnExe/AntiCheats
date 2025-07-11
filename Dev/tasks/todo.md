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

## Code Quality & Linting
- **(Medium) Complete JSDoc and minor linting for `AntiCheatsBP/scripts/core/uiManager.js`:**
    - **Details:** After fixing critical errors and running `eslint --fix`, approximately 128 linting issues remain in `uiManager.js`. These are primarily JSDoc-related (missing descriptions, param types, etc.) but also include some `no-unused-vars`, `no-magic-numbers`, and other minor warnings/errors.
    - **Context:** This is a follow-up from the general linting task undertaken by Jules on the `fix/linting-issues` branch. Note: 3 `no-unused-vars` warnings for `helpfulLinks` and `confirmed` variables are persistent false positives and have been accepted with disable comments in place.
