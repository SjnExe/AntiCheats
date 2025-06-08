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
        *   **Phase 3: Fire Control (Completed - Initial Ignition Control):**
            *   Implemented configuration options (`enableFireAntiGrief`, `allowAdminFire`, `fireControlAction`, etc.) in `config.js`.
            *   Default set to disabled (`enableFireAntiGrief: false`) as per user request.
            *   Updated `handleItemUseOn` event handler to monitor Flint & Steel and Fire Charge usage.
            *   Unauthorized fire starting attempts are handled based on `fireControlAction` ("extinguish" by cancelling event, "warn", "logOnly").
            *   Admin notifications and logging via `actionManager` profile `world_antigrief_fire`.
            *   Noted: Advanced fire tracking (spread, duration, max blocks) is complex and deferred to future enhancements.
    *   **Phase 4: Other Griefing Vectors (Partially Implemented):**
        *   **Lava Placement Control (Completed - Bucket Use):**
            *   Implemented configuration options (`enableLavaAntiGrief`, `allowAdminLava`, `lavaPlacementAction`) in `config.js`.
            *   Default set to disabled (`enableLavaAntiGrief: false`) as per user request.
            *   Updated `handleItemUseOn` event handler to monitor `minecraft:lava_bucket` usage.
            *   Unauthorized lava placement attempts are handled based on `lavaPlacementAction` ("remove" by cancelling event, "warn", "logOnly").
            *   Admin notifications and logging via `actionManager` profile `world_antigrief_lava`.
            *   **Water Placement Control (Completed - Bucket Use):**
                *   Implemented configuration options (`enableWaterAntiGrief`, `allowAdminWater`, `waterPlacementAction`) in `config.js`.
                *   Default set to disabled (`enableWaterAntiGrief: false`) as per user request.
                *   Updated `handleItemUseOn` event handler to monitor `minecraft:water_bucket` usage.
                *   Unauthorized water placement attempts are handled based on `waterPlacementAction` ("remove" by cancelling event, "warn", "logOnly").
                *   Admin notifications and logging via `actionManager` profile `world_antigrief_water`.
            *   **Block Spam Control (Completed - Initial Rate-Based):**
                *   Implemented configuration options (`enableBlockSpamAntiGrief`, `blockSpamBypassInCreative`, `blockSpamTimeWindowMs`, `blockSpamMaxBlocksInWindow`, `blockSpamMonitoredBlockTypes`, `blockSpamAction`) in `config.js`.
                *   Default set to disabled (`enableBlockSpamAntiGrief: false`).
                *   Added `checkBlockSpam` function to `buildingChecks.js` to monitor placement rate of all/specific blocks.
                *   Called from `handlePlayerPlaceBlockAfterEvent`.
                *   Unauthorized block spam attempts are handled based on `blockSpamAction` (e.g., "warn", "logOnly").
                *   Admin notifications and logging via `actionManager` profile `world_antigrief_blockspam`.
            *   **Entity Spam Control (Partially Implemented - `itemUseOn` for placeables):**
                *   Investigated entity spam techniques and documented strategy in `Dev/notes/EntitySpamDetectionStrategy.md`.
                *   Implemented configuration options (`enableEntitySpamAntiGrief`, `entitySpamMonitoredEntityTypes`, etc.) in `config.js`, disabled by default.
                *   Created `checkEntitySpam` function in `entityChecks.js` for rate-limiting spawns of monitored entities by a player.
                *   Integrated `checkEntitySpam` into `handleItemUseOn` for items that place monitored entities (e.g., boats, armor stands). This allows for player-attributed spam detection and prevention for these items.
                *   If spam is detected via `itemUseOn` and action is "kill", the item use is cancelled, preventing entity spawn.
                *   **Next Step (TODO):** Further investigation for attributing spawns from `entitySpawn` event (e.g., spawn eggs) to players and integrating `checkEntitySpam` there if feasible.
        *   (TODO): Investigate other common griefing methods (e.g., piston grief) and potential mitigations for them, and advanced block spam detection (density/patterns).

Please refer to `Dev/tasks/todo.md` for new tasks to begin if this list is empty.
