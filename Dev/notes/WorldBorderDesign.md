# World Border System Design

## 1. Overview

This document outlines the design for a configurable world border system for the AntiCheats addon. The primary goal is to restrict players to a defined area within each dimension, preventing them from traveling too far out.

## 2. Core Requirements

*   **Shape:** Initial implementation will support a **Square** border. Circular borders can be a future enhancement.
*   **Dimension-Specific:** Borders must be configurable independently for each dimension (Overworld, Nether, End).
*   **Configuration:**
    *   Border parameters (shape, center, size) will be stored persistently.
    *   Ability to enable/disable the border per dimension.
*   **Enforcement:** Players exceeding the border limits will be teleported back to a safe point within the border.
*   **Admin Commands:** Commands for setting, viewing, and removing/disabling borders.
*   **Exemptions:** Administrative users (based on rank/tag) should be exempt from border enforcement.
*   **Performance:** The enforcement mechanism should be reasonably performant.

## 3. Detailed Design

### 3.1. Border Definition (Square)

*   **`centerX`**: Integer, X-coordinate of the border's center.
*   **`centerZ`**: Integer, Z-coordinate of the border's center.
*   **`halfSize`**: Integer, half the side length of the square border.
    *   `minX = centerX - halfSize`
    *   `maxX = centerX + halfSize`
    *   `minZ = centerZ - halfSize`
    *   `maxZ = centerZ + halfSize`
*   **`dimensionId`**: String (e.g., "minecraft:overworld", "minecraft:the_nether", "minecraft:the_end").
*   **`enabled`**: Boolean, whether the border is active for this dimension.

### 3.2. Configuration Storage

*   World dynamic properties will be used.
*   A key per dimension, e.g., `anticheat:worldborder_overworld`.
*   The value will be a JSON string:
    ```json
    {
        "shape": "square",
        "centerX": 0,
        "centerZ": 0,
        "halfSize": 1000,
        "enabled": true
    }
    ```
    If a dimension has no border set, its dynamic property might be undefined or `enabled` might be `false`.

### 3.3. Enforcement Mechanism

*   **Trigger:** Player movement, checked periodically (e.g., every tick or few ticks) in `main.js`.
*   **Check:**
    1.  Get player's current location `(px, py, pz)` and `dimensionId`.
    2.  Retrieve border settings for `dimensionId`.
    3.  If border is `enabled` and player is not exempt:
        *   If `px < minX` or `px > maxX` or `pz < minZ` or `pz > maxZ`, the player is outside.
*   **Action (Teleport Back):**
    *   Calculate the target teleport location:
        *   `targetX = Math.max(minX, Math.min(px, maxX))`
        *   `targetZ = Math.max(minZ, Math.min(pz, maxZ))`
        *   `targetY = py` (initially, or find safe Y at targetX, targetZ later if needed)
    *   Teleport player to `(targetX, targetY, targetZ)` in the same dimension.
    *   Send a warning message to the player (e.g., "You have reached the world border.").
    *   **Damage-Based Enforcement (New):**
        *   This system can optionally precede direct teleportation.
        *   **Per-Dimension Settings:** Stored alongside geometric data (see 3.2, extended):
            *   `enableDamage` (boolean): If true, damage is applied.
            *   `damageAmount` (number): Damage dealt per interval (e.g., 0.5 for half a heart).
            *   `damageIntervalTicks` (number): How often (in ticks) damage is applied.
            *   `teleportAfterNumDamageEvents` (number): Player is teleported after this many damage applications if still outside.
        *   **Logic:**
            1.  If a player is outside the border:
                *   Their `pData.ticksOutsideBorder` counter increments.
                *   If `enableDamage` is true for the dimension's border:
                    *   If `pData.ticksOutsideBorder` is a multiple of `damageIntervalTicks`, the player receives `damageAmount` (e.g., via `player.applyDamage()`).
                    *   Their `pData.borderDamageApplications` counter increments.
                    *   If `pData.borderDamageApplications` reaches `teleportAfterNumDamageEvents`, the player is then teleported back (as described above).
                *   If `enableDamage` is false, the player is teleported back immediately upon being detected outside (original behavior).
            2.  When a player re-enters the border or is teleported back, `ticksOutsideBorder` and `borderDamageApplications` are reset.
        *   **Player Data (`pData`) Fields:**
            *   `ticksOutsideBorder`: Tracks consecutive ticks a player has been outside the current dimension's border. Reset when they re-enter or are teleported.
            *   `borderDamageApplications`: Tracks how many times damage has been applied to the player for the current excursion outside the border. Reset similarly.
*   **Finding Safe Y (Future Enhancement):** A simple Y-coordinate might place players in blocks. A robust solution would involve raycasting or checking block types at the target location to find a safe spawn spot. For initial implementation, teleporting to the same Y or a fixed safe Y (like player's current Y clamped within world height) might be used, with the understanding it might not always be perfect. A simpler first approach is to teleport to player's current Y at the clamped X,Z.

### 3.4. Admin Commands (Conceptual)

*   Module: `commands/worldborder.js`
*   Permission: Owner/Admin level.
*   **`!worldborder set square <centerX> <centerZ> <halfSize> [dimensionId]`**
    *   Parses arguments. `dimensionId` is optional, defaults to player's current dimension.
    *   Validates inputs (numbers, valid dimension).
    *   Saves settings using `worldBorderManager.saveBorderSettings(dimensionId, settings)`.
    *   Confirms to admin.
*   **`!worldborder get [dimensionId]`**
    *   Retrieves and displays settings for the dimension.
*   **`!worldborder on|off [dimensionId]`**
    *   Enables or disables an existing border for the dimension. Updates the `enabled` flag in storage.
*   **`!worldborder remove [dimensionId]`**
    *   Clears all border settings for the dimension (or sets `enabled: false` and clears geometric data).

### 3.5. Exemptions

*   Players with a permission level of Admin or Owner (e.g., via `playerUtils.getPlayerPermissionLevel() <= permissionLevels.admin`) will not be affected by the border enforcement. This check will be performed before enforcement.

### 3.6. Manager/Utility (`worldBorderManager.js`)

*   `getBorderSettings(dimensionId)`: Returns border object or null.
*   `saveBorderSettings(dimensionId, settings)`: Saves/updates border settings.
*   `clearBorderSettings(dimensionId)`: Removes border settings.
*   `isOutsideBorder(playerLocation, dimensionId)`: Helper function to check position against loaded border for that dimension. (This logic might live in the tick loop directly too).

### 3.7. Configuration in `config.js`

*   `enableWorldBorderSystem` (boolean): Master switch for the entire world border feature. Default `false`.
*   `worldBorderDefaultSettings`: Potentially an object to define default border sizes if a dimension's border is enabled but not configured. (Optional, explicit configuration per dimension is clearer).
*   `worldBorderWarningMessage` (string): Message sent to players when teleported.
*   `worldBorderExemptRanks` (array of strings/numbers): Ranks exempt (e.g. `[permissionLevels.owner, permissionLevels.admin]`). (Or use `playerUtils.getPlayerPermissionLevel()`).
*   Default damage settings (e.g., `worldBorderDefaultEnableDamage`, `worldBorderDefaultDamageAmount`, etc.) for when a border is set by command and these are not specified.
*   Particle visual settings (see 3.8).


### 3.8. Visual Indicators (Particles)

To help players understand where the border is, especially when they are close, a particle wall effect can be displayed.

*   **Mechanism:** When a player is near a border edge, particles are spawned in a "wall" formation along that edge. These particles are spawned specifically for the nearby player (e.g., using `player.dimension.spawnParticle()`), so only they see their relevant border segment.
*   **Global Configuration (`config.js`):**
    *   `worldBorderEnableVisuals` (boolean): Master switch for the particle visuals. Default `false`.
    *   `worldBorderParticleName` (string): The name of the particle to use (e.g., `"minecraft:end_rod"`).
    *   `worldBorderVisualRange` (number): How close (in blocks) a player must be to a border edge to see the particles. Default `24`.
    *   `worldBorderParticleDensity` (number): Particles per block along the edge. Higher is denser. Default `1`.
    *   `worldBorderParticleWallHeight` (number): Height of the particle wall in blocks. Default `4`.
    *   `worldBorderParticleSegmentLength` (number): Length of the particle wall segment rendered in front of/around the player. Default `32`.
    *   `worldBorderVisualUpdateIntervalTicks` (number): How often (in ticks) to refresh visuals for each player. Default `10` (0.5 seconds).
*   **Logic (`main.js` player tick loop):**
    1.  If `worldBorderEnableVisuals` is true and the current dimension has an active border.
    2.  Check if `currentTick - pData.lastBorderVisualTick >= worldBorderVisualUpdateIntervalTicks`. If so, update `pData.lastBorderVisualTick`.
    3.  For each of the four border planes (minX, maxX, minZ, maxZ):
        *   If `Math.abs(player.location.x - planeX) < worldBorderVisualRange` (or equivalent for Z planes).
        *   Spawn a line of particles along that plane, centered around the player's corresponding coordinate (e.g., for the X-plane, centered on player.location.z).
        *   The length of this line is `worldBorderParticleSegmentLength`, clamped to the actual border size.
        *   Particles are spawned from `player.location.y` up to `player.location.y + worldBorderParticleWallHeight - 1`.
        *   The number of particles along the line is determined by `worldBorderParticleDensity`.
*   **Performance:** Throttling updates per player (`worldBorderVisualUpdateIntervalTicks`) and only rendering segments for nearby players helps manage performance. Choosing a less intensive particle is also important.

## 4. Future Enhancements

*   Circular border shape.
*   More sophisticated "safe teleport" logic (e.g., finding ground level, avoiding hazards).
*   Per-world (if multi-world support ever comes to BDS scripting in this way) or per-dimension group settings.
*   Gradual border shrinking/expanding commands.
*   Different particle patterns or effects for the visual border.
