# Entity Spam Griefing Detection Strategy

## 1. Overview

Entity spamming involves players rapidly spawning or placing multiple entities to cause visual clutter, lag, obstruct areas, or disrupt gameplay. This document outlines an initial strategy for detecting and mitigating basic entity spam, primarily focusing on spawn rates.

## 2. Common Entity Spamming Techniques & Problematic Types

*   **Vehicle Spam:** Rapid placement of boats, minecarts. Can be used to lag servers or block pathways.
*   **Armor Stand Spam:** Placing numerous armor stands, often unnamed or posed obstructively.
*   **Passive Mob Spam (Less Common for Grief, More for Lag):** Spawning excessive numbers of passive mobs like chickens or pigs using spawn eggs if available to non-admins. (This strategy will focus more on placeable entities first).
*   **Item Frame Spam:** Similar to armor stands, can clutter areas.
*   **Falling Block Spam:** (More complex) Using commands or mechanics to create many falling block entities. (Likely out of scope for initial detection based on simple spawn events).
*   **End Crystal Spam:** If players can obtain and place them in the Overworld/Nether, can be used for unexpected explosions/grief.

**Key Entity Types for Initial Monitoring:**
*   `minecraft:boat`
*   `minecraft:minecart` (and variants like `minecraft:chest_minecart`, `minecraft:hopper_minecart`)
*   `minecraft:armor_stand`
*   `minecraft:item_frame`
*   `minecraft:end_crystal` (if relevant to the server context)

## 3. Proposed Initial Detection Strategy: Rate-Based Detection

The initial strategy will focus on detecting rapid spawning of specific entity types by a player. This will use the `world.afterEvents.entitySpawn` event.

### 3.1. Key Detection Factors:

*   **Spawn Rate:** The number of monitored entities spawned by a player within a specific time window.
*   **Entity Types:** Focusing on entities commonly used for spamming.
*   **Gamemode:** Potentially different thresholds or bypasses for Creative mode (though less common for entity *griefing* from creative, still possible).

### 3.2. Configuration Options (in `config.js`):

*   `enableEntitySpamAntiGrief` (boolean): Master switch for this check. Default: `false`.
*   `entitySpamBypassInCreative` (boolean): If `true`, players in Creative mode bypass this check. Default: `true`.
*   `entitySpamTimeWindowMs` (number): Time window (in milliseconds) to count entity spawns. Example: `2000` (2 seconds).
*   `entitySpamMaxSpawnsInWindow` (number): Maximum monitored entities allowed to be spawned by a player in the window before flagging. Example: `5`.
*   `entitySpamMonitoredEntityTypes` (array of strings): List of entity type IDs to monitor (e.g., `["minecraft:boat", "minecraft:armor_stand"]`).
*   `entitySpamAction` (string): Action to take upon detection. Examples:
    *   `"kill"`: Kills the entity that triggered the threshold.
    *   `"warn"`: Warns the player and notifies admins.
    *   `"logOnly"`: Only logs the detection and notifies admins.
    *   *(Note: "kill" is the most direct action for an `afterEvent` like `entitySpawn` when a threshold is breached by the latest spawn).*

### 3.3. Implementation Logic (within `handleEntitySpawnEvent_AntiGrief` or a new dedicated handler):

1.  Check `enableEntitySpamAntiGrief`. If disabled, return.
2.  The `entitySpawn` event provides `event.entity`. The `event.cause` (e.g., `EntitySpawnCause.Spawned`) is important, but the direct *player* source isn't always available.
    *   **Challenge:** Attributing spawns directly to a player. If an item is used (e.g., boat item places a boat entity), the player might be inferable if the spawn event is handled immediately after an item use event that *was* player-caused. However, for spawn eggs or other mechanisms, this is harder.
    *   **Initial Approach:** For entities spawned not directly from a player interaction (e.g. breeding, world gen), this check should not apply. Focus on player-caused spawns. This might require correlating with `itemUseOn` or other player action events if `entitySpawn` itself lacks player context.
    *   **If player context is available (e.g. from a recent interaction):**
        1.  Check `entitySpamBypassInCreative`. If true and player is in Creative, return.
        2.  Maintain a list of recent entity spawn timestamps for the player, specific to monitored types (`pData.recentEntitySpamTimestamps[entityType]`).
        3.  When a monitored entity type is spawned by a player:
            *   Add current timestamp to the respective list for that entity type for that player.
        4.  Filter timestamps older than `entitySpamTimeWindowMs`.
        5.  If the count of timestamps for that entity type exceeds `entitySpamMaxSpawnsInWindow`:
            *   Trigger `actionManager.executeCheckAction("world_antigrief_entityspam", player, violationDetails, dependencies)`.
            *   `violationDetails` should include count, window, entity type, etc.
            *   If `entitySpamAction` is `"kill"`, attempt `event.entity.kill()`.
            *   Clear the timestamps for that entity type for that player to prevent immediate re-flagging.

### 3.4 Identifying the Spawning Player:
This is the trickiest part for `entitySpawn`.
*   **For placeable items (boats, armor stands, item frames, minecarts):** The `itemUseOn` event (or potentially `playerPlaceBlock` if these items place a "block" version first that then spawns the entity) is likely player-caused. We might need to:
    1.  In `itemUseOn`, if a player uses an item that spawns one of the monitored entities (e.g., places a boat item), record `pData.lastPlacedMonitoredEntityType = 'minecraft:boat'` and `pData.lastPlacedMonitoredEntityTick = currentTick`.
    2.  In `entitySpawn`, if a monitored entity spawns, check if any player is nearby and has `pData.lastPlacedMonitoredEntityType` matching the spawned entity, and if `currentTick - pData.lastPlacedMonitoredEntityTick` is very small (e.g., 0-1 ticks). This is an inference.
*   **For spawn eggs:** `itemUseOn` (if used on a block) or `itemUse` (if used in air) would be the trigger. The player is known. The `entitySpawn` event would follow.
*   **Simplification for initial step:** The check might initially only work well for spawns that can be reasonably attributed to a player through recent actions.

## 4. Future Considerations (Deferred):

*   **Density-Based Checks:** Detecting too many monitored entities of a certain type within a given area, regardless of spawn rate (e.g., >X boats in a Y-block radius).
*   **More Sophisticated Player Attribution:** Better ways to link spawned entities back to the specific player who caused their spawn.
*   **Specific Entity Logic:** Some entities might need unique limits or checks (e.g., end crystals due to their explosive nature).

This initial rate-based strategy, with a focus on player-attributable spawns, provides a starting point for combating entity spam.
