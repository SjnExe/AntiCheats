# Entity Spam Griefing Detection Strategy

## 1. Overview

Entity spamming involves players rapidly spawning or placing multiple entities to cause visual clutter, lag, obstruct areas, or disrupt gameplay. This document outlines an initial strategy for detecting and mitigating basic entity spam, primarily focusing on spawn rates.

## 2. Scope of Player-Attributed Spam Control

This strategy primarily focuses on entity spam that can be directly attributed to a player's actions, particularly through:
*   **Direct Item Use (Spawn Eggs):** Using spawn egg items. Controlled via `world.beforeEvents.itemUse` and `world.beforeEvents.itemUseOn` to prevent the spawn.
*   **Direct Item Placement (Placeable Entities):** Placing items that directly become entities (e.g., boats, armor stands, item frames, end crystals). Also controlled via `world.beforeEvents.itemUseOn` to prevent placement.

**Key Entity Types for Direct Player Control Monitoring (via `itemUse`/`itemUseOn`):**
*   `minecraft:boat`
*   `minecraft:minecart` (and variants like `minecraft:chest_minecart`, `minecraft:hopper_minecart`)
*   `minecraft:armor_stand`
*   `minecraft:item_frame`
*   `minecraft:end_crystal`
*   Spawn eggs for any monitored entity (e.g., `minecraft:pig_spawn_egg` if `minecraft:pig` is in a monitored list for other reasons, or specific spawn eggs themselves).

This document also discusses strategies for player-constructed entities (like Golems) and challenges with dispenser-based spam.

## 3. Detection Strategy for Directly Placed/Spawned Entities: Rate-Based Prevention

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

### 3.5. Specific Strategy for Spawn Egg & Direct Entity Placement Spam

Items like spawn eggs, boats, armor stands, etc., provide a direct way for players to create entities and can be a source of spam if not rate-limited. The most reliable approach for these is to act preventatively using `world.beforeEvents.itemUse` (for using in air/on entity, mainly spawn eggs) and `world.beforeEvents.itemUseOn` (for using on a block, covering both spawn eggs and direct entity placements like boats).

**Event Handling:**

1.  **Target Events:** `itemUse` and `itemUseOn`.
2.  **Item Check:** In these handlers, check if `eventData.itemStack.typeId` matches the pattern of a spawn egg (e.g., ends with `_spawn_egg`).
3.  **Entity Type Derivation:**
    *   If a spawn egg is detected, derive the corresponding `entityTypeId` by removing the `_spawn_egg` suffix from the item's `typeId`. For example, `minecraft:pig_spawn_egg` becomes `minecraft:pig`.
    *   This derived `entityTypeId` is then checked against `config.entitySpamMonitoredEntityTypes`.
4.  **Spam Check Execution:**
    *   If the derived entity type is monitored, call the existing `checkEntitySpam` function, passing the `player` (from `eventData.source`), the derived `entityTypeId`, and other necessary dependencies.
5.  **Action (Prevention):**
    *   Since `itemUse` and `itemUseOn` are `beforeEvents`, if `checkEntitySpam` returns `true` (indicating spam is detected) and `config.entitySpamAction` is `"kill"` (which is interpreted as "prevent item use" in this context):
        *   Set `eventData.cancel = true`. This will prevent the spawn egg from being consumed and the entity from being spawned.
        *   The player should be notified that their action was prevented due to rapid item use/entity spawning.
    *   If `config.entity_spam_action` is `"warn"` or `"logOnly"`, the event is not cancelled, and `checkEntitySpam` handles the logging/notifications as usual.

This approach leverages cancellable `beforeEvents` for more effective control over entity spam originating from directly player-controlled item uses, with reliable player attribution.

## 4. Player-Constructed Entities (e.g., Golems, Withers)

Entities like Snow Golems, Iron Golems, and Withers can be constructed by players placing blocks in specific patterns. These are not spawned via `itemUse` events but rather result from block placement sequences.

### 4.1. Detection Idea:

1.  **Player Places Key Block:** The player places the final "key" block that would complete a constructable entity (e.g., a pumpkin for Snow/Iron Golems, or a Wither skull for a Wither).
2.  **`handlePlayerPlaceBlockAfter` Event:** This event handler detects the placement of such key blocks.
3.  **Structure Verification:** Upon placement of a key block, the handler checks the surrounding blocks to verify if a valid structure for the corresponding constructable entity has just been completed.
4.  **Flag Player Data:** If a valid structure is confirmed, a flag is set on the player's data (`pData`), for example:
    `pData.expectingConstructedEntity = { type: "minecraft:snow_golem", location: ApproximateLocation, tick: currentTick }`.
    *   `ApproximateLocation` should be sufficient to identify the spawn area (e.g., the location of the key block).
    *   `currentTick` helps in matching the entity spawn event timely.

### 4.2. Attribution in `entitySpawn`:

1.  **`world.afterEvents.entitySpawn` Handler:** An existing or new handler listens for entity spawns.
2.  **Check for Constructable Types:** When an entity of a type that can be player-constructed spawns (e.g., `minecraft:snow_golem`, `minecraft:iron_golem`, `minecraft:wither`), the handler proceeds.
3.  **Check Player Flags:** The handler iterates through online players' `pData` looking for the `expectingConstructedEntity` flag.
4.  **Attribute if Match:** If a player has this flag, and the newly spawned entity's:
    *   Type matches `pData.expectingConstructedEntity.type`.
    *   Location is consistent with `pData.expectingConstructedEntity.location` (e.g., within a small radius).
    *   Spawn tick is very close to `pData.expectingConstructedEntity.tick` (e.g., within 1-2 ticks).
    ...then the spawn is attributed to that player.
5.  **Call Spam Check:** `checkEntitySpam(player, entityType, ...)` is then called for the attributed player and the spawned entity type.
6.  **Clear Flag:** The `pData.expectingConstructedEntity` flag should be cleared after a short duration or successful attribution to prevent incorrect future attributions.

### 4.3. Action:

*   If `checkEntitySpam` indicates spam (returns `true`) and `config.entitySpamAction === "kill"`, the newly spawned constructed entity (e.g., the golem) is killed reactively (e.g., using `entity.kill()`).
*   Other actions like `warn` or `logOnly` are handled as usual by `checkEntitySpam`.

This method provides a way to attribute these world-generated entities back to a player's actions for rate-limiting.

## 5. Dispenser-Based Spam

Dispensers can be used to deploy entities like boats, armor stands, or even spawn eggs if they contain them.

*   **Challenge:** Attributing entities spawned by dispensers directly to the player who powered the dispenser is difficult with current Bedrock Scripting APIs. The `entitySpawn` event for a dispenser-deployed entity does not carry direct information about the player who triggered the Redstone signal.
*   **Current Approach:** Player-attributed rate-limiting (as described in Section 3 and 4) will generally *not* apply to dispenser-originated spawns.
*   **Reactive Killing Concerns:** A global reactive killing of all dispenser-spawned monitored entities (e.g., if `config.entitySpamAction === "kill"`, killing any boat spawned by a dispenser) is considered too disruptive. Many legitimate Redstone contraptions rely on dispensers for various functions, and such a broad action would break them.
*   **Future Mitigation:** Future density-based checks (see Section 8) might offer partial mitigation for area saturation caused by dispensers, but this would be an area check, not player-specific spam prevention.

## 6. Non-Monitored Player Spawns

Other player-driven entity spawn mechanisms exist that are not the primary focus of this anti-grief spam feature:

*   **Animal Breeding:** Players breeding animals.
*   **/summon Command:** If a player has permissions to use `/summon` and is the explicit source/cause.

These could theoretically be integrated into a rate-limiting system if they become significant abuse vectors. However, for the initial implementation, the focus remains on direct item placements/uses and player-constructed entities which are more common in griefing scenarios.

## 7. Future Considerations (Deferred):

*   **Density-Based Checks:** Detecting too many monitored entities of a certain type within a given area, regardless of spawn rate (e.g., >X boats in a Y-block radius). This could help with dispenser spam indirectly.
*   **More Sophisticated Player Attribution:** Exploring further ways to link spawned entities back to the specific player who caused their spawn, especially for indirect mechanisms if APIs evolve.
*   **Specific Entity Logic:** Some entities might need unique limits or checks (e.g., end crystals due to their explosive nature, even if directly placed).

This strategy, combining preventative `beforeEvent` controls for direct placements/uses and reactive `afterEvent` controls for player-constructed entities, aims to provide a robust system for combating common entity spam vectors.
