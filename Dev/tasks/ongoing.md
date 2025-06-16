# Ongoing Tasks & Next Steps for Development

This document summarizes the current work-in-progress and pending tasks for the AntiCheat addon, intended for handoff to the next development session.

## I. Current Active Plan: Coding Style Review & Corrections - Batch 1 & 2 (Core, Checks Directories)

*   - Coding style review and corrections for core files completed (including `i18n.js` constant rename, `camelCase` for log `actionType`s in `eventHandlers.js` & `uiManager.js`, `logManager.js` JSDoc update, `reportManager.js` logging refactor). Details moved to `completed.md`.
*   - Reviewed all files in `AntiCheatsBP/scripts/checks/` subdirectories for style compliance.
*   - Corrected `console.warn` to `playerUtils.debugLog` in `checks/chat/swearCheck.js`.
*   - Removed duplicated code block in `checks/movement/invalidSprintCheck.js`.
*   - Refactored `logManager.addLog` `actionType` to `camelCase` in `checks/player/clientInfoChecks.js`.
*   - Uncommented useful `debugLog` calls in `checks/world/entityChecks.js`, `fastUseCheck.js`, and `illegalItemCheck.js`.
*   - Noted consistent use of `snake_case` for `checkType` identifiers throughout all `checks` files (e.g., 'movement_fly_hover', 'player_antigmc').

## II. General Pending Tasks (from `Dev/tasks/todo.md`)

These are higher-level features and areas for future development:

*   **Advanced Cheat Detections:**
    *   Packet Anomalies: Investigate and implement detections.
    *   Further Chat Violations (if any specific ones are identified beyond current checks).
*   **SjnExe Parity Goals (Broad Categories):**
    *   Admin Tools & Management Expansion.
    *   UI Enhancements (Admin Panel).
    *   System Features.
    *   World Management & Protection.
    *   Normal Player Panel Features (`!panel`):
*   **Specific Deferred/Considered Features:**
    *   `!worldborder`: Advanced dynamic particle effects (previously deferred).
    *   `!worldborder`: Support for more complex shapes (currently a consideration).
*   **AutoMod System:**
    - **CRITICAL Developer Action Required for AutoMod Functionality:**
        - `actionManager.js` (specifically the `executeAutomodAction` function or its equivalent) MUST be updated to handle `camelCase` `actionType` strings from `automodConfig.js` (e.g., expect 'tempBan' instead of 'TEMP_BAN' or 'TempBan').
        - **AutoMod will NOT function correctly and may break if `actionManager.js` is not updated to match the new `camelCase` `actionType` convention in `automodConfig.js`.**
    - **Developer Action Required for `chat_repeat_spam`:**
        - Identify the module/function for `checks.checkSpam` (referenced in `eventHandlers.js`).
        - Determine the exact `checkType` string this function uses when flagging for *repeat message spam*.
        - Verify `eventHandlers.js` correctly uses `config.spamRepeatCheckEnabled` (or another appropriate key if `checks.checkSpam` is a general spam handler) for the condition to call `checks.checkSpam`.
        - Update the `automodConfig.js` key (currently `"chat_repeat_spam"`) to the actual `checkType` if it differs.
    - **Developer Decision Required for 'example_' `checkType`s:**
        - For `speedCheck.js` (currently using `"example_speed_ground"`) and `reachCheck.js` (currently using `"example_reach_attack"`):
            - Decide whether to refactor these check scripts to use configurable action profile names from `config.js` (e.g., `config.groundSpeedActionProfileName || "movement_speed_ground"`).
            - If refactored, update the corresponding `checkType` keys in `automodConfig.js` (`automodRules` and `automodPerCheckTypeToggles`).
            - If not refactored, the current keys in `automodConfig.js` are technically correct based on current script usage, but remain non-standard.
    - **Post-Developer Review & General Refinement:**
        - Review all AutoMod rule thresholds and actions for balance and effectiveness.
        - Implement AutoMod rules for any other minor or uncovered checks if deemed necessary.
        - Consider if `flyCheck.js` and `speedCheck.js` need more granular AutoMod rules for different sub-types of violations beyond what's currently implemented (e.g., if they generate more specific `checkType`s that aren't yet covered).

## III. Project-Wide Conventions / Refactoring

*   **Developer Decision Required: `checkType` Identifier Casing:**
    - Most `checkType` string identifiers (used in check files when calling `executeCheckAction`, as keys in `actionProfiles.js`, and as keys in `automodConfig.js`) are currently `snake_case` (e.g., `movement_fly_hover`, `player_antigmc`).
    - **Decision:** Should these be refactored to `camelCase` (e.g., `movementFlyHover`, `playerAntiGmc`) for project-wide consistency with other identifier naming conventions and recent `actionType` refactoring?
    - This would be a significant cross-file refactoring task affecting all check scripts, `actionProfiles.js`, and `automodConfig.js`.
    - If yes, `Dev/CodingStyle.md` should also be updated to document this convention for `checkType` identifiers.

## IV. Recent User Feedback & Context for Future Work

*   **UI Command Design:** For future UI-based commands (e.g., a potential `!admin` command or enhancements to `!panel`), design them to be accessible by various permission levels, showing different information/buttons contextually (similar to the recent `!panel` refactor for player vs. admin views).
*   **Development Workflow:** Continue applying cleanup and refactoring "in batches" where appropriate.

---
*This summary was generated by Jules for session continuity.*
