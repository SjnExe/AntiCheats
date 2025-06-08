# Ongoing Tasks

This list tracks features and tasks that are currently under development.

## Features in Progress
*   **Anti-Grief System:** (Moved from todo.md)
    *   **Phase 1: TNT Control (Completed):**
        *   Implemented configuration options (`enableTntAntiGrief`, `allowAdminTntPlacement`, `tntPlacementAction`) in `config.js`.
        *   Added event handler to monitor `minecraft:tnt` placement.
        *   Unauthorized TNT placement is handled based on `tntPlacementAction` (remove, warn, logOnly), with appropriate player/admin notifications and logging via `actionManager`.
        *   Defined conceptual test cases for TNT control in `Dev/tests/AntiGriefTests.md`.
            *   Default set to disabled (`enableTntAntiGrief: false`) as per user request.
        *   **Phase 2: Wither Control (Completed - Kill/Log Actions):**
            *   Implemented configuration options (`enableWitherAntiGrief`, `allowAdminWitherSpawn`, `witherSpawnAction`) in `config.js`.
            *   Default set to disabled (`enableWitherAntiGrief: false`) as per user request.
            *   Added event handler for `entitySpawn` to monitor Wither spawns (`minecraft:wither`).
            *   Unauthorized Wither spawns are handled based on `witherSpawnAction` ("kill", "prevent" (as kill), "logOnly").
            *   Admin notifications and logging are handled via `actionManager` profile `world_antigrief_wither_spawn`.
            *   Noted limitation: Spawner identification is difficult with `entitySpawn`, so `allowAdminWitherSpawn` currently doesn't exempt admin-spawned Withers if the feature is active.
    *   **Phase 3: Fire Control (TODO):** Investigate and implement measures for auto-extinguishing excessive fires not from natural sources.
    *   **Phase 4: Other Griefing Vectors (TODO):** Investigate other common griefing methods and potential mitigations.

Please refer to `Dev/tasks/todo.md` for new tasks to begin if this list is empty.
