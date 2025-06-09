# Entity Spam Griefing Detection Strategy

## 1. Overview

Entity spamming involves players rapidly spawning or placing multiple entities to cause visual clutter, lag, obstruct areas, or disrupt gameplay. This document outlines an initial strategy for detecting and mitigating basic entity spam, primarily focusing on spawn rates.

## 2. Scope of Player-Attributed Spam Control

This strategy primarily focuses on entity spam that can be directly attributed to a player's actions. The **primary controls** are for:

*   **Direct Item Use (Spawn Eggs):** Using spawn egg items. These are best controlled preventatively via `world.beforeEvents.itemUse` and `world.beforeEvents.itemUseOn`.
*   **Direct Item Placement (Placeable Item-Entities):** Placing items that directly become entities (e.g., boats, armor stands, item frames, end crystals). These are also best controlled preventatively via `world.beforeEvents.itemUseOn`.

Utilizing `beforeEvents` for these scenarios allows for the **prevention** of the entity spawn/placement if it's deemed spam, which is more effective than reactive measures for these specific cases.

**Key Entity Types for Direct Player Control Monitoring (primarily via `itemUse`/`itemUseOn` for prevention):**
*   `minecraft:boat`
*   `minecraft:minecart` (and variants like `minecraft:chest_minecart`, `minecraft:hopper_minecart`)
*   `minecraft:armor_stand`
*   `minecraft:item_frame`
*   `minecraft:end_crystal`
*   Spawn eggs for any monitored entity (e.g., `minecraft:pig_spawn_egg` if `minecraft:pig` is in a monitored list for other reasons, or specific spawn eggs themselves).

This document also discusses strategies for player-constructed entities (like Golems, which require a different attribution approach) and challenges with dispenser-based spam.

## 3. Detection Strategy for Entities Covered by `itemUse` and `itemUseOn`: Rate-Based Prevention

The initial strategy for entities spawned via direct item use (spawn eggs) or item placement (boats, armor stands) focuses on detecting rapid attempts by a player and preventing them using `beforeEvents`.

### 3.1. Key Detection Factors (for `itemUse`/`itemUseOn` based prevention):

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
    *   *(Note: For `beforeEvents`, "kill" in the config is interpreted as "cancel the event" to prevent the item use/entity placement).*

### 3.3. Implementation Logic (primarily within `handleItemUse` and `handleItemUseOn` event handlers):

1.  Check `enableEntitySpamAntiGrief`. If disabled, return.
2.  The event data (`eventData` from `itemUse` or `itemUseOn`) provides `eventData.source` (the player) and `eventData.itemStack` (the item being used).
3.  Identify the entity type:
    *   For spawn eggs: Derive `entityTypeId` from `itemStack.typeId` (e.g., `minecraft:pig_spawn_egg` -> `minecraft:pig`).
    *   For placeable item-entities: The `itemStack.typeId` itself might represent the entity (e.g., `minecraft:boat`, `minecraft:armor_stand`). A mapping might be needed if item ID and entity ID differ (e.g. `minecart` item for `minecart` entity).
4.  If the identified `entityTypeId` is in `config.entitySpamMonitoredEntityTypes`:
    1.  Check `entitySpamBypassInCreative`. If true and player is in Creative, return.
    2.  Access `pData.recentEntitySpawnAttempts[entityType]` (a list of timestamps for *attempted* spawns/placements).
    3.  Add current timestamp to this list for the player and entity type.
    4.  Filter timestamps older than `entitySpamTimeWindowMs`.
    5.  If the count of timestamps exceeds `entitySpamMaxSpawnsInWindow`:
        *   Trigger `actionManager.executeCheckAction("world_antigrief_entityspam", player, violationDetails, dependencies)`.
        *   `violationDetails` should include count, window, entity type, item used.
        *   If `config.entitySpamAction` is effectively "prevent" (e.g., "kill" in config, interpreted as cancel for beforeEvents):
            *   Set `eventData.cancel = true`.
            *   Notify the player.
        *   Clear the timestamps for that entity type for that player to prevent immediate re-flagging on the next attempt.
    6.  If not spam, the item use proceeds normally. The actual entity spawn will be handled by the game.

This `beforeEvent`-based approach is the most reliable for attributing and preventing spam from direct item usage, as player context is clear and the action can be cancelled.

*(The following sections discuss scenarios where `beforeEvent` prevention is not directly applicable, and reactive measures or more complex attribution logic are needed.)*

## 4. Player-Constructed Entities (e.g., Golems, Withers constructed by players)

Entities like Snow Golems, Iron Golems, and Withers can be constructed by players placing blocks in specific patterns. These are not spawned via `itemUse` events (and thus cannot be easily prevented using the `beforeEvent` strategy above) but rather result from block placement sequences that cause the game to spawn the entity.

### 4.1. Detection Idea:

1.  **Player Places Key Block:** The player places the final "key" block that would complete a constructable entity (e.g., a pumpkin for Snow/Iron Golems, or a Wither skull for a Wither).
2.  **`handlePlayerPlaceBlockAfter` Event:** This event handler detects the placement of such key blocks.
3.  **Structure Verification:** Upon placement of a key block, the handler checks the surrounding blocks to verify if a valid structure for the corresponding constructable entity has *just* been completed by this placement.
4.  **Flag Player Data:** If a valid structure is confirmed, a flag is set on the player's data (`pData`), for example:
    `pData.expectingConstructedEntity = { type: "minecraft:snow_golem", location: ApproximateLocation, dimension: player.dimension, tick: currentTick }`.
    *   `ApproximateLocation` should be sufficient to identify the spawn area (e.g., the location of the key block or the center of the structure).
    *   `dimension` is crucial for multi-world environments.
    *   `currentTick` helps in matching the entity spawn event timely.

### 4.2. Attribution in `entitySpawn`:

1.  **`world.afterEvents.entitySpawn` Handler:** An existing or new handler listens for entity spawns.
2.  **Check for Constructable Types:** When an entity of a type that can be player-constructed spawns (e.g., `minecraft:snow_golem`, `minecraft:iron_golem`, `minecraft:wither`), the handler proceeds.
3.  **Check Player Flags:** The handler iterates through online players' `pData` looking for the `expectingConstructedEntity` flag.
4.  **Attribute if Match:** If a player has this flag, and the newly spawned entity's:
    *   Type matches `pData.expectingConstructedEntity.type`.
    *   Location is consistent with `pData.expectingConstructedEntity.location` (e.g., within a small radius, typically 2-3 blocks for Golems).
    *   Dimension matches `pData.expectingConstructedEntity.dimension`.
    *   Spawn tick is very close to `pData.expectingConstructedEntity.tick` (e.g., within 1-5 ticks, allowing for slight server processing delays).
    ...then the spawn is attributed to that player.
5.  **Call Spam Check:** `checkEntitySpam(player, entity.typeId, ...)` is then called for the attributed player and the spawned entity type.
6.  **Clear Flag:** The `pData.expectingConstructedEntity` flag should be cleared after a short duration or successful attribution to prevent incorrect future attributions.

### 4.3. Action:

*   If `checkEntitySpam` indicates spam (returns `true`) and `config.entitySpamAction === "kill"`, the newly spawned constructed entity (e.g., the golem) is killed reactively (e.g., using `entity.kill()`).
*   Other actions like `warn` or `logOnly` are handled as usual by `checkEntitySpam`.

This method provides a way to attribute these world-generated entities back to a player's actions for rate-limiting.

## 5. Dispenser-Based Spam

Dispensers can be used to deploy entities like boats, armor stands, or even spawn eggs if they contain them.

*   **Challenge for Player-Attributed Rate-Limiting:** Attributing entities spawned by dispensers directly to the player who powered the dispenser is a known challenge. The `entitySpawn` event from a dispenser-created entity does not directly link back to the player who initiated the Redstone signal.
*   **Global Reactive Killing is Problematic:** Attempting to control this by simply killing all dispenser-spawned monitored entities (if `config.entitySpamAction === "kill"`) would be highly disruptive to legitimate Redstone contraptions (e.g., boat/minecart launchers, item droppers that use entities temporarily). This is not the current approach for player-specific spam.
*   **Future Mitigation Idea:** Future density-based checks (see Section 7) might offer partial mitigation for extreme area saturation caused by dispensers (e.g., a dispenser rapidly filling a small area with hundreds of boats). This would be an area-based control, not player-attributed rate-limiting.

## 6. Other Non-Monitored Player-Driven Spawns

Other player-driven entity spawn mechanisms exist that are not the primary focus of this *anti-grief entity spam* feature, partly because they are harder to abuse for spam or have legitimate uses that are hard to distinguish from spam without more complex heuristics:

*   **Animal Breeding:** Players breeding animals. While many entities can be created, the process is usually slower and more involved than typical spam tactics.
*   **/summon Command:** If a player has permissions to use `/summon` and is the explicit source/cause of the entity. This is typically an administrative action or part of creative building/map making.

These mechanisms could theoretically be integrated into a rate-limiting system if specific abuse vectors emerge that warrant it, but they are not the current focus for the controls designed against rapid, disruptive entity spamming.

## 7. Future Considerations (Deferred for player-attributed spam, some relate to area denial):

*   **Density-Based Checks:** Detecting too many monitored entities of a certain type within a given area, regardless of spawn rate (e.g., >X boats in a Y-block radius). This could help with dispenser spam indirectly.
*   **More Sophisticated Player Attribution:** Exploring further ways to link spawned entities back to the specific player who caused their spawn, especially for indirect mechanisms if APIs evolve.
*   **Specific Entity Logic:** Some entities might need unique limits or checks (e.g., end crystals due to their explosive nature, even if directly placed).

This strategy, combining preventative `beforeEvent` controls for direct placements/uses and reactive `afterEvent` controls for player-constructed entities, aims to provide a robust system for combating common entity spam vectors.
