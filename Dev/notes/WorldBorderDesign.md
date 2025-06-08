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

## 4. Future Enhancements

*   Circular border shape.
*   Damage-based enforcement.
*   Visual indicators for the border (particles).
*   More sophisticated "safe teleport" logic.
*   Per-world (if multi-world support ever comes to BDS scripting in this way) or per-dimension group settings.
*   Gradual border shrinking/expanding commands.
