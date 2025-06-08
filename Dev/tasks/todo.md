# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## High Priority / Next Up
*No high priority tasks currently identified.*

## Medium Priority

*   **Advanced Cheat Detections:**
    *   **Packet Anomalies / Chat Violations:**
        *   **Sending Messages During Invalid States:** Detect if player sends chat messages while performing actions that should normally restrict chat input (e.g., actively in combat, using an item, chest open - API feasibility varies). (Scythe 'BadPackets')

*   **Admin Tools & Management (Expansion):** SjnExe parity goal where applicable.
    *   **Enhanced Commands:**
        *   `!worldborder <get|set|remove> [params...]`: Manage a configurable world border (API dependent for enforcement).
    *   **UI Enhancements (Admin Panel Concept):** SjnExe parity goal.
        *   *(Existing: Base UI with Inspect, Reset Flags, List Watched)*
    *   **System Features:** SjnExe parity goal.
        *   Investigate: Device Ban (highly API dependent, likely difficult/impossible with Script API alone, might involve external database if server has such capabilities). (SafeGuard)

*   **World Management & Protection:** SjnExe parity goal.

*   **Normal Player Panel Features (`!panel`):**

## Low Priority / Ideas

*   **Player Utilities & Experience:** SjnExe parity goal.
    *   Death Effects: Investigate and implement cosmetic effects on player death.
    *   Chat Formatting (potentially linked to the Rank System). (Attempted 2025-07-22, but not completed due to persistent subtask execution issues preventing necessary code modifications).
*   **Logging Enhancements:** SjnExe parity goal.
    *   **Detailed Player Join/Leave Logging:** Log player join/leave events with more context than default debug logs (e.g., IP if available via API - unlikely, device type).
*   **Localization:** (from original todo) Consider options for localizing warning messages and UI elements for a multi-lingual audience.
*   **AutoMod System Review & Future Enhancements:**
    - Conduct a holistic review of the implemented AutoMod system (Phases 1-5) for any further refinements, performance optimizations, or new action types/conditions based on usage.

## Documentation & Workflow
*   **Task File Maintenance:** AI assistant should keep `completed.md`, `ongoing.md`, and `todo.md` current.
