# Ongoing Tasks

As of 2024-07-31

## Admin Panel UI (`!panel`) Development
*   **Phase 5: Configuration & Advanced (Future) (In Progress):**
    *   View/Edit parts of `config.js`: (View read-only: Completed; Edit simple values: TODO).
    *   Implement Persistent Logging & UI Viewer for Admin Actions (Ban, Mute, Kick): Log actions with details (admin, target, reason, duration, timestamp) and create a UI to view these logs. (Completed)

## New Admin Commands (User Suggested)
*   `!tp <playerName>` & `!tp <x> <y> <z>`: Implement teleport command for admins/owner. (User Suggestion) (TODO)
    *   *Enhancement: Add optional dimension parameter for coordinate-based teleports (e.g., `!tp <playerToMoveOrSelf> <x> <y> <z> [dimension: overworld|nether|end]`). If omitted, defaults to current dimension of player being moved.*
*   `!gmc`, `!gms`, `!gma`, `!gmsp`: Implement game mode change commands for admins/owner. (User Suggestion) (TODO)
