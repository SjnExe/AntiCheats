# World Border System Design

## 1. Overview

This document outlines the design for a configurable world border system for the AntiCheats addon. The primary goal is to restrict players to a defined area within each dimension, preventing them from traveling too far out.

## 2. Core Requirements

*   **Shape:** Supports **Square** (defined by center and half-size) and **Circle** (defined by center and radius) borders.
*   **Dimension-Specific:** Borders must be configurable independently for each dimension (Overworld, Nether, End).
*   **Configuration:**
    *   Border parameters (shape, center, size) will be stored persistently.
    *   Ability to enable/disable the border per dimension.
*   **Enforcement:** Players exceeding the border limits will be teleported back to a safe point within the border.
*   **Admin Commands:** Commands for setting, viewing, and removing/disabling borders.
*   **Exemptions:** Administrative users (based on rank/tag) should be exempt from border enforcement.
*   **Performance:** The enforcement mechanism should be reasonably performant.

## 3. Detailed Design

### 3.1. Border Definition

*   **`shape`**: `"square" | "circle"`. This determines how the border is geometrically defined and enforced.
*   **`centerX`**: Integer, X-coordinate of the border's center for both shapes.
*   **`centerZ`**: Integer, Z-coordinate of the border's center for both shapes.
*   **`halfSize`**: Integer. Required if `shape` is "square". Defines half the side length of the square border.
    *   For square: `minX = centerX - halfSize`, `maxX = centerX + halfSize`, `minZ = centerZ - halfSize`, `maxZ = centerZ + halfSize`.
*   **`radius`**: Integer. Required if `shape` is "circle". Defines the radius of the circular border.
*   **`dimensionId`**: String (e.g., "minecraft:overworld", "minecraft:the_nether", "minecraft:the_end"). Identifies the dimension these settings apply to.
*   **`enabled`**: Boolean, whether the border is active for this dimension.
*   Damage properties (see 3.3) are also stored alongside these geometric settings.

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
        *   **Square Border Check:** If `shape === "square"`, player is outside if `loc.x < minX` or `loc.x > maxX` or `loc.z < minZ` or `loc.z > maxZ`.
        *   **Circular Border Check:** If `shape === "circle"`, calculate squared distance from player to center: `distSq = (loc.x - centerX)^2 + (loc.z - centerZ)^2`. Player is outside if `distSq > radius^2`.
*   **Action (Teleport Back):**
    *   Calculate the target teleport location `(targetX, targetZ)`:
        *   **For Square Borders:** The player is teleported to the closest point on the border edge, offset slightly inwards (e.g., 0.5 blocks).
            *   `targetX` is `minX + 0.5` if `loc.x < minX`, or `maxX - 0.5` if `loc.x > maxX`. Otherwise, `loc.x`.
            *   `targetZ` is `minZ + 0.5` if `loc.z < minZ`, or `maxZ - 0.5` if `loc.z > maxZ`. Otherwise, `loc.z`.
        *   **For Circular Borders:** The player is teleported to a point on the circumference, offset slightly inwards.
            *   Calculate vector from center to player: `dx = loc.x - centerX`, `dz = loc.z - centerZ`.
            *   Calculate current distance: `currentDist = Math.sqrt(dx*dx + dz*dz)`.
            *   If `currentDist === 0` (player at center, unlikely if outside), nudge to `targetX = centerX + (radius - 0.5)`, `targetZ = centerZ`.
            *   Else, `targetX = centerX + (dx / currentDist) * (radius - 0.5)` and `targetZ = centerZ + (dz / currentDist) * (radius - 0.5)`.
    *   Determine `targetY` using Advanced Safe Y-Coordinate Calculation (see 3.3.1).
    *   Teleport player to `(targetX, targetY, targetZ)` in the same dimension.
    *   Send a warning message to the player (e.g., "You have reached the world border.").
    *   **Damage-Based Enforcement:**
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

### 3.3.1. Advanced Safe Y-Coordinate Calculation for Teleport (`findSafeTeleportY`)

To minimize players being teleported into blocks or hazardous locations, an advanced safe Y-coordinate is determined:
*   The function (`findSafeTeleportY` in `main.js`) is called with the target dimension, X, Z coordinates, the player's current Y level (`initialY`), and optionally the player object for debugging.
*   It clamps `initialY` within the dimension's valid height range (`dimension.heightRange.min` to `max - 2`).
*   **Downward Search:** It first searches downwards from the player's current Y (up to a defined depth, e.g., 10 blocks).
    *   A Y-level (`checkY`) is considered safe if it provides a 2-block high air gap (`blockFeet.isAir` and `blockHead.isAir`).
    *   Preference is given to spots where the block below the feet (`checkY - 1`) is solid (`blockBelowFeet.isSolid`).
*   **Upward Search:** If no suitable spot is found downwards, it then searches upwards from the player's `initialY` (up to a defined depth, e.g., 5 blocks) using the same criteria for an air gap, preferably on solid ground.
*   **Fallback:** If no safe spot is found within the search limits, the function defaults to `Math.floor(initialY)`.
*   The search respects world height limits and handles potential errors when checking blocks at extreme coordinates.

### 3.4. Admin Commands (Conceptual)

*   Module: `commands/worldborder.js`
*   Permission: Owner/Admin level.
*   **`!worldborder set <square|circle> <centerX> <centerZ> <sizeParam> [dimensionId]`**
    *   `sizeParam` is `halfSize` for "square" shape, or `radius` for "circle" shape.
    *   Parses arguments. `dimensionId` is optional, defaults to player's current dimension.
    *   Validates inputs (numbers, valid dimension, valid shape).
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
    3.  **Square Border Visuals:** For each of the four border planes (minX, maxX, minZ, maxZ):
        *   If the player is within `worldBorderVisualRange` of a plane.
        *   Spawn a line of particles along that plane, centered around the player's corresponding coordinate.
        *   The length of this line is `worldBorderParticleSegmentLength`, clamped to the actual border size.
        *   Particles are spawned from `player.location.y` up to `player.location.y + worldBorderParticleWallHeight - 1`.
        *   The number of particles along the line is determined by `worldBorderParticleDensity`.
    4.  **Circular Border Visuals:**
        *   If `borderSettings.shape === "circle"`.
        *   Calculate player's distance from the circle's center.
        *   If `Math.abs(distanceToCenter - radius) < worldBorderVisualRange` (player is near the circular edge).
        *   Spawn particles along an arc segment of the border. The segment is `worldBorderParticleSegmentLength` long, centered around the player's angular position relative to the circle's center.
        *   Particle height and density are controlled by the same global config values.
*   **Performance:** Throttling updates per player (`worldBorderVisualUpdateIntervalTicks`) and only rendering segments for nearby players helps manage performance. Choosing a less intensive particle is also important.

## 4. Future Enhancements

*   More sophisticated "safe teleport" logic if the current implementation proves insufficient (e.g., more extensive search, hazard type detection).
*   Per-world (if multi-world support ever comes to BDS scripting in this way) or per-dimension group settings.
*   Gradual border shrinking/expanding commands.
*   Different particle patterns or effects for the visual border.
