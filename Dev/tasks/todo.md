# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## Potential Future Enhancements (Post-Review Identifications)
*   **Localization System:** Review all hardcoded user-facing strings (currently acceptable) and consider implementing a proper localization system using keys and `playerUtils.getString` if multilingual support or easier string management is desired in the future.
*   **`reportManager.js` Enhancements:**
    *   Consider adding more specific report clearing functions if needed (e.g., clear by reported player only, clear by reporter only).
    *   Consider adding functionality to update report status (e.g., `open` -> `under_review` -> `resolved`). This would likely involve new commands for admins.
*   **`uiManager.js` Refinements:** Consider further componentization of `uiManager.js` if UI complexity grows significantly. Improve JSDoc for individual panel functions.
*   **Performance Review of Tick Loop:** If performance issues arise, the main tick loop in `main.js` (especially the checks section) would be a candidate for optimization (e.g., staggering checks further, optimizing individual check logic).
*   **Offline Player Command Support:** Extend commands like `!purgeflags`, `!watch`, `!unwatch` to support offline players by directly manipulating their persisted data via dynamic properties. This requires careful implementation.
*   **Report Command Cooldown:** Implement a cooldown for the `!report` command to prevent spam, potentially storing `lastReportTime` in `PlayerAntiCheatData`.
*   **Confirmation for `!clearreports all`:** Add a ModalForm confirmation step before executing `!clearreports all` to prevent accidental data loss.
