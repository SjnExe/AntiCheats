# Ongoing Tasks

This list tracks features and tasks that are currently under development.

## Features in Progress
*   **AutoMod System - Phase 1: Core Framework & Configuration**
    - Objective: Establish the foundational structure, configuration, and basic decision-making logic for the AutoMod system.
    - Status: In progress.

Please refer to `Dev/tasks/todo.md` for new tasks to begin if this list is empty.
overwrite_file_with_block
Dev/tasks/todo.md
# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## High Priority / Next Up
*No high priority tasks currently identified.*

## Medium Priority

*   **Advanced Cheat Detections:**
    *   **Packet Anomalies / Chat Violations:**
        *   **Invalid Max Render Distance:** (API Dependent) If client settings like render distance are accessible or inferable and an invalid value is detected, flag. (Scythe 'BadPackets')
        *   **Sending Messages During Invalid States:** Detect if player sends chat messages while performing actions that should normally restrict chat input (e.g., actively in combat, using an item, chest open - API feasibility varies). (Scythe 'BadPackets')

*   **Admin Tools & Management (Expansion):** SjnExe parity goal where applicable.
    *   **Enhanced Commands:**
        *   `!worldborder <get|set|remove> [params...]`: Manage a configurable world border (API dependent for enforcement).
    *   **UI Enhancements (Admin Panel Concept):** SjnExe parity goal.
        *   *(Existing: Base UI with Inspect, Reset Flags, List Watched)*
        *   Investigate: In-game config editor via UI (for `config.js` values).
    *   **System Features:** SjnExe parity goal.
        *   Investigate: Device Ban (highly API dependent, likely difficult/impossible with Script API alone, might involve external database if server has such capabilities). (SafeGuard)

*   **World Management & Protection:** SjnExe parity goal.
    *   Investigate & Implement: Anti-Grief (e.g., auto-clear placed TNT by non-admins, auto-extinguish excessive fires not from natural sources).

*   **Normal Player Panel Features (`!panel`):**

## AutoMod System (Future Phases)

*   **Phase 2: Implement Basic Actions (Warn, Kick) & Flag-Only**
    - Implement execution logic in `AutoModManager` for "WARN", "KICK", and "FLAG_ONLY" action types.
    - Integrate with configuration for messages and reasons.
    - Add logging for AutoMod actions taken.
*   **Phase 3: Implement Persistent Actions (Ban, Mute) & Freeze**
    - Implement execution logic for "TEMP_BAN", "PERM_BAN", "MUTE", and "FREEZE" actions.
    - Ensure proper integration with `playerDataManager` (for bans/mutes) and `freeze` command logic.
    - Handle durations and persistent storage.
*   **Phase 4: Implement Illegal Item Removal**
    - Implement the "REMOVE_ILLEGAL_ITEM" action.
    - Logic to identify and remove all instances of specified illegal items from player inventory.
*   **Phase 5: Admin Notifications, System Toggles, and Documentation**
    - Add admin notifications for AutoMod actions.
    - Implement finer-grained toggles for AutoMod per check type (if desired beyond the global toggle).
    - Update all relevant project documentation (`README.md`, etc.).
    - Conduct thorough end-to-end testing.

## Low Priority / Ideas

*   **Player Utilities & Experience:** SjnExe parity goal.
    *   Death Effects: Investigate and implement cosmetic effects on player death.
    *   Chat Formatting (potentially linked to the Rank System).
*   **Logging Enhancements:** SjnExe parity goal.
    *   **Detailed Player Join/Leave Logging:** Log player join/leave events with more context than default debug logs (e.g., IP if available via API - unlikely, device type).
*   **Localization:** (from original todo) Consider options for localizing warning messages and UI elements for a multi-lingual audience.

## Documentation & Workflow
*   **Task File Maintenance:** AI assistant should keep `completed.md`, `ongoing.md`, and `todo.md` current.
