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
- **(High) Resolve outstanding ESLint issues:**
    - **File:** `AntiCheatsBP/scripts/core/uiManager.js`
        - **Error:** `756:90 error Parsing error: Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses`
        - **Details:** This is a JavaScript parsing error reported by ESLint. The issue is that an expression likely mixes a logical operator (`&&` or `||`) with the nullish coalescing operator (`??`) without using parentheses to define the order of operations. For example, `a && b ?? c` should be `(a && b) ?? c` or `a && (b ?? c)`.
        - **Challenge:** The reported line number (756) and character (90) do not directly point to such an expression in the visible code. The actual problematic expression needs to be located. It might be part of a larger or more complex statement, or the error reporting might be slightly off.
        - **Attempts:** Manual code review and basic `grep` searches did not definitively locate the expression.
    - **File:** `AntiCheatsBP/scripts/core/eventHandlers.js`
        - **Warnings:**
            - `1006:1 warning Missing JSDoc @param "eventData" description jsdoc/require-param-description`
            - `1007:1 warning Missing JSDoc @param "dependencies" description jsdoc/require-param-description`
        - **Details:** These warnings indicate that the JSDoc `@param` tags for `eventData` and `dependencies` are missing descriptions according to the `jsdoc/require-param-description` ESLint rule.
        - **Challenge:** The JSDoc block for the exported `handleBeforeChatSend` constant (around lines 1003-1008, which includes the reported lines 1006 and 1007) *does* appear to have descriptions for these parameters. An attempt to make the descriptions more verbose for the internal `_handleBeforeChatSend` function (which is wrapped by `profileEventHandler` to create the exported `handleBeforeChatSend`) did not resolve these warnings. The exact reason why these specific lines are flagged is unclear – it might be related to the `profileEventHandler` wrapper or a subtlety in how the JSDoc rule is applied.
        - **ESLint Config:** `jsdoc/require-param-description` is set to `warn`.
