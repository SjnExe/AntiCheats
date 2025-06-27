# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## Command Implementations
*   **Implement `!purgeflags` command:**
    *   Define logic to completely clear all flags and violation history for a specified player from their `PlayerAntiCheatData`.
    *   Ensure appropriate admin/owner permissions.
    *   Add comprehensive logging.
*   **Implement `!report` command:**
    *   Allow players to report other players with a reason.
    *   Add the report to the system managed by `reportManager.js` (requires adding `addReport` functionality back to `reportManager.js` or implementing it directly in the command, preferably the former).
    *   Notify online admins about the new report.
    *   Add cooldowns or limits if necessary.
*   **Implement `!viewreports` command:**
    *   Allow admins to view reports (all, by reporter, by reported player, or specific report ID).
    *   Consider pagination or a UI for easier viewing if many reports exist.
    *   Requires `getReports` (exists) and potentially more specific query functions in `reportManager.js`.
*   **Implement `!clearreports` command:**
    *   Allow admins to clear specific reports by ID, all reports for a player, or all reports entirely.
    *   Requires adding report clearing functionality to `reportManager.js`.
    *   Add confirmation steps for clearing all reports.
*   **Implement `!watch` command:**
    *   Allow admins to add a player to a "watchlist."
    *   Set `pData.isWatched = true` for the target player.
    *   This will enable more detailed debug logging for the watched player as per existing `playerUtils.debugLog` calls.
*   **Implement `!unwatch` command:**
    *   Allow admins to remove a player from the "watchlist."
    *   Set `pData.isWatched = false` for the target player.

## Potential Future Enhancements (Post-Review Identifications)
*   **Localization System:** Review all hardcoded user-facing strings (currently acceptable) and consider implementing a proper localization system using keys and `playerUtils.getString` if multilingual support or easier string management is desired in the future.
*   **`reportManager.js` Enhancements:** Add functions like `addReport(reporter, reported, reason)`, `clearReportById(reportId)`, `clearReportsForPlayer(playerName)` to encapsulate report data manipulation.
*   **`uiManager.js` Refinements:** Consider further componentization of `uiManager.js` if UI complexity grows significantly. Improve JSDoc for individual panel functions.
*   **Performance Review of Tick Loop:** If performance issues arise, the main tick loop in `main.js` (especially the checks section) would be a candidate for optimization (e.g., staggering checks further, optimizing individual check logic).
