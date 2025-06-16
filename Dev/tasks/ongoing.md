# Ongoing Tasks & Next Steps for Development

This document summarizes the current work-in-progress and pending tasks for the AntiCheat addon, intended for handoff to the next development session.

## Current Focus: Advanced Cheat Detections - Further Chat Violations
*   Currently implementing and reviewing chat violation checks.
*   Completed: Message Content Repetition/Flood Check (`checkChatContentRepeat`).
*   Completed: Unicode Abuse Check (Zalgo/Excessive Diacritics) (`checkUnicodeAbuse`).
*   Completed: Enhanced Swear Check (Obfuscation Resistance).
*   Completed: Review of Newline Spam Handling (concluded existing system is sufficient when configured).
*   Completed: Gibberish Detection Check (`checkGibberish` - V1 focusing on ratios/consonants).
*   Next: All primary proposed 'Further Chat Violations' have been addressed. Consider moving to other tasks or more complex/lower priority chat items if desired.

## I. Current Active Plan: Coding Style Review & Corrections - Batch 1 & 2 (Core, Checks Directories)

*   - Coding style review and corrections for core files completed (including `i18n.js` constant rename, `camelCase` for log `actionType`s in `eventHandlers.js` & `uiManager.js`, `logManager.js` JSDoc update, `reportManager.js` logging refactor). Details moved to `completed.md`.
*   - Reviewed all files in `AntiCheatsBP/scripts/checks/` subdirectories for style compliance.
*   - Further review indicates that `checkType` identifiers used by the AutoMod system (originating from `executeCheckAction` calls in check files) are consistently `camelCase`, aligning with `automodConfig.js`. The previous note regarding `snake_case` might have referred to a different internal context or was outdated.

## II. Full Pending Task List (Moved from todo.md)

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

### High Priority / Next Up
*No high priority tasks currently identified.*

### Medium Priority

*   **Advanced Cheat Detections:**
    *   **Packet Anomalies:** (Investigate and implement detections)
    *   **Further Chat Violations:** (Investigation in progress)
        *   [COMPLETED] Message Content Repetition/Flood Check (`checkChatContentRepeat`).
        *   [COMPLETED] Unicode Abuse Check (Zalgo/Excessive Diacritics) (`checkUnicodeAbuse`).
        *   [COMPLETED] Enhanced Swear Check (Obfuscation Resistance).
        *   [REVIEWED - SUFFICIENT] Review Newline Spam Handling (if current `chatNewline` check is insufficient for flood scenarios).
        *   [COMPLETED - V1] Gibberish Detection (V1 focusing on ratios/consonants).
        *   (Lower Priority/More Complex remaining: Simple Impersonation, Excessive Mentions, Refined External Link Patterns) - *Consider next if continuing with chat violations.*

*   **Admin Tools & Management (Expansion):** SjnExe parity goal where applicable.
    *   **Enhanced Commands:**
        *   `!worldborder` Enhancements: (Initial square/circle, damage, visuals, safe teleport, gradual resize, pause/resume, interpolation methods, per-dimension static particle types, alternating particle sequence, and pulsing density effects are complete. `!wb remove` now requires confirmation). Further enhancements to consider (see `Dev/notes/WorldBorderDesign.md`):
            *   - Advanced dynamic particle effects (e.g., color/scale changes via custom particle JSONs) investigated; deferred for now.
            *   - (Consider more complex shape support - if still relevant beyond square/circle).
    *   **UI Enhancements (Admin Panel Concept):** SjnExe parity goal.
        *   *(Existing: Base UI with Inspect, Reset Flags, List Watched, Player Actions, Server Management, Config Editor)*
        *   - Added Server Tick & World Time to System Info panel - Implemented.
    *   **System Features:** SjnExe parity goal.

*   **World Management & Protection:** SjnExe parity goal.

*   **Normal Player Panel Features (`!panel`):**

### Low Priority / Ideas

*   **Player Utilities & Experience:** SjnExe parity goal.

### AutoMod Enhancements
*(Tasks related to improving the AutoMod system - new rules, rule adjustments, etc.)*

### Chat Moderation Features
*(Tasks related to chat content filtering, spam control, etc.)*

### Documentation & Workflow
*   **Task File Maintenance:** AI assistant should keep `completed.md`, `ongoing.md`, and `todo.md` current.

## III. Project-Wide Conventions / Refactoring

## IV. Recent User Feedback & Context for Future Work

*   **UI Command Design:** For future UI-based commands (e.g., a potential `!admin` command or enhancements to `!panel`), design them to be accessible by various permission levels, showing different information/buttons contextually (similar to the recent `!panel` refactor for player vs. admin views).
*   **Development Workflow:** Continue applying cleanup and refactoring "in batches" where appropriate.

---
*This summary was generated by Jules for session continuity.*
