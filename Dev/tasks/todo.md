# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## High Priority / Next Up
*No high priority tasks currently identified.*

## Medium Priority
*   **Advanced Cheat Detections:**
    *   Investigate and implement more complex Killaura/Aimbot detection (e.g., analyzing hit patterns, pitch/yaw consistency).
    *   Explore checks for Scaffold, Tower, other automated building cheats.
    *   Consider checks for Timer (game speed manipulation) if possible with Script API.
*   **Persistence for Player Data/Flags:**
    *   Investigate using scoreboard objectives or dynamic properties for more persistent storage of player flags or reputation, so data isn't lost on server restart/player rejoin.
*   **Admin Tool Expansion:**
    *   `!ac inspect <playername>`: Command to show a summary of a player's current `pData` (flags, watched status, key stats).
    *   `!ac resetflags <playername>`: Command to reset flags for a player.
    *   Consider a simple UI for admins using `@minecraft/server-ui`.
*   **Manifest API Versioning:**
    *   Review `@minecraft/server` (and related) module versions in `BP/manifest.json`. Pin to specific, tested beta versions or evaluate moving to stable APIs if they meet all feature requirements.

## Low Priority / Ideas
*   **Performance Optimization:** Profile existing checks under load and optimize if necessary.
*   **Localization:** Consider options for localizing warning messages if the addon is intended for a multi-lingual audience.
*   **Automated Actions:** Based on flag counts, implement configurable automated actions (e.g., temp-kick, reduced player capabilities). This requires careful design to avoid false positives.

## Documentation & Workflow
*   **Root `README.md` Updates:** Ensure the main project `README.md` is kept up-to-date with major features by the AI assistant.
*   **Task File Maintenance:** AI assistant should keep `completed.md`, `ongoing.md`, and `todo.md` current.
