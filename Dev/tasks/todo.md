# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## High Priority / Next Up
*No high priority tasks currently identified.*

## Medium Priority

*   **Advanced Cheat Detections:**
    *   **Packet Anomalies / Chat Violations:**

*   **Admin Tools & Management (Expansion):** SjnExe parity goal where applicable.
    *   **Enhanced Commands:**
        *   `!worldborder` Enhancements: (Initial square/circle, damage, visuals, safe teleport, & gradual resize are now complete. `!wb remove` now requires confirmation - Implemented). Further enhancements to consider (see `Dev/notes/WorldBorderDesign.md`):
            *   - Implement commands to pause and resume an ongoing gradual border resize (e.g., `!worldborder resizepause [dimensionId]` and `!worldborder resizeresume [dimensionId]`) - Implemented.
            *   - Options for different particle patterns or effects for world border visuals (Global particle type changeable via `!wb setglobalparticle`. Per-dimension particle type now changeable via `!wb setparticle`. Further investigation for dynamic patterns pending).
            *   - Consider different resize interpolation methods (e.g., ease-in/out) instead of just linear.
            *   - (Consider more complex shape support - if still relevant beyond square/circle).
    *   **UI Enhancements (Admin Panel Concept):** SjnExe parity goal.
        *   *(Existing: Base UI with Inspect, Reset Flags, List Watched)*
    *   **System Features:** SjnExe parity goal.

*   **World Management & Protection:** SjnExe parity goal.

*   **Normal Player Panel Features (`!panel`):**

## Low Priority / Ideas

*   **Player Utilities & Experience:** SjnExe parity goal.
*   **Localization:** (from original todo) Consider options for localizing warning messages and UI elements for a multi-lingual audience.

## AutoMod Enhancements
*(Tasks related to improving the AutoMod system - new rules, rule adjustments, etc.)*

## Chat Moderation Features
*(Tasks related to chat content filtering, spam control, etc.)*

## Documentation & Workflow
*   **Task File Maintenance:** AI assistant should keep `completed.md`, `ongoing.md`, and `todo.md` current.
