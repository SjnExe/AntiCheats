# Block Spam Griefing Detection Strategy

## 1. Overview

Block spamming is a common griefing tactic where players rapidly place blocks to obstruct areas, create visual nuisances, trap players, or potentially cause lag. This document outlines an initial strategy for detecting and mitigating basic block spam.

## 2. Common Block Spamming Techniques

*   **Pillaring/Walling:** Rapid placement of columns or walls, often with common blocks like dirt, cobblestone, or netherrack.
*   **Area Filling:** Covering a large flat area or filling a volume with blocks.
*   **Obstructive/Offensive Patterns:** Creating specific undesirable shapes or messages. (Harder to detect generically).

## 3. Existing Relevant Checks

*   **`checkFastPlace` (`buildingChecks.js`):**
    *   Currently detects rapid block placement by tracking timestamps of recent placements within a configured time window (`fastPlaceTimeWindowMs`) and flagging if a maximum number of blocks (`fastPlaceMaxBlocksInWindow`) is exceeded.
    *   This serves as a good foundation for rate-based detection.
*   **`checkTower` (`buildingChecks.js`):**
    *   Manages `pData.recentBlockPlacements` which stores location and rotation data for recent blocks. This could be useful for future density or pattern analysis but is not the primary focus for the initial block spam strategy.

## 4. Proposed Initial Detection Strategy: Enhanced Rate-Based Detection

The initial strategy will enhance the existing rate-based detection mechanism, likely by modifying or creating a new function similar to `checkFastPlace`.

### 4.1. Key Detection Factors:

*   **Placement Rate:** The number of blocks placed by a player within a specific time window.
*   **Block Types:** Focusing on blocks commonly used for spamming, or conversely, ignoring blocks typically used in legitimate fast building.
*   **Gamemode:** Potentially different thresholds or bypasses for Creative mode.

### 4.2. Configuration Options (in `config.js`):

*   `enableBlockSpamAntiGrief` (boolean): Master switch for this specific check. Default: `false`.
*   `blockSpamBypassInCreative` (boolean): If `true`, players in Creative mode bypass this check. Default: `true`.
*   `blockSpamTimeWindowMs` (number): Time window (in milliseconds) to count block placements. Example: `1000`.
*   `blockSpamMaxBlocksInWindow` (number): Maximum blocks allowed in the window before flagging. Example: `8` (potentially stricter than generic fast place).
*   `blockSpamMonitoredBlockTypes` (array of strings): List of block type IDs (e.g., `"minecraft:dirt"`, `"minecraft:cobblestone"`).
    *   If the list is empty, the check applies to all block types.
    *   If populated, the check *only* counts placements of these specified block types towards the limit.
*   `blockSpamAction` (string): Action to take upon detection. Examples:
    *   `"warn"`: Warns the player and notifies admins.
    *   `"logOnly"`: Only logs the detection and notifies admins (no player warning).
    *   `"kick"`: Kicks the player (potentially after multiple warnings/flags).
    *   *(Note: Direct block removal for an after-event like `checkFastPlace` is complex. Prevention is better suited for a `beforeEvent` if a more aggressive approach is needed later).*

### 4.3. Implementation Logic (within `handlePlayerPlaceBlockAfterEvent` context):

1.  Check `enableBlockSpamAntiGrief`. If disabled, return.
2.  Check `blockSpamBypassInCreative`. If true and player is in Creative, return.
3.  Maintain a list of recent block placement timestamps for the player (`pData.recentBlockSpamTimestamps` or similar, to differentiate from generic `fastPlace`).
4.  When a block is placed:
    *   If `blockSpamMonitoredBlockTypes` is populated, check if the current `block.typeId` is in the list. If not, do not record this placement for spam checking.
    *   Add current timestamp to `pData.recentBlockSpamTimestamps`.
5.  Filter timestamps older than `blockSpamTimeWindowMs`.
6.  If the count of relevant timestamps exceeds `blockSpamMaxBlocksInWindow`:
    *   Trigger `actionManager.executeCheckAction("world_antigrief_blockspam", player, violationDetails, dependencies)`.
    *   `violationDetails` should include count, window, block type, etc.
    *   The configured `blockSpamAction` (warn, logOnly, potentially kick via action profile) would be handled by the `actionManager` or specific logic tied to it.

## 5. Future Considerations (Deferred):

*   **Density-Based Checks:** If rate-based detection is insufficient, implement checks for high block density in a small area around player placements. This would use `pData.recentBlockPlacements`.
*   **Pattern Recognition:** More advanced (and complex) logic to detect specific griefing patterns.
*   **Preventative Actions:** For more aggressive mitigation (like preventing block placement), logic would need to be in a `playerPlaceBlock.before` event handler. The current proposal focuses on detection and warning/logging as an initial step using an after-event.

This initial strategy aims to provide a foundational layer of block spam detection that can be built upon if necessary.

## 6. Advanced Strategy: Density-Based Detection

While rate-based detection catches rapid placements, density-based detection aims to identify situations where an area is being excessively filled with blocks, even if the instantaneous placement rate isn't always high. This is particularly useful against walling, area filling, or creating large obstructive shapes.

### 6.1. Data Requirements & Collection

Effective density checking requires a history of recently placed blocks by a player, including their `typeId` and location.

*   **Proposal:** Enhance `pData.recentBlockPlacements` (currently managed by `checkTower` in `buildingChecks.js`) to store the `typeId` of each block.
    *   The `newPlacement` object in `checkTower` would be modified from:
        `{ x, y, z, pitch, yaw, tick }`
        to:
        `{ x, y, z, typeId, pitch, yaw, tick }`
    *   The existing `config.towerPlacementHistoryLength` (e.g., 20 blocks) would serve as the history limit for blocks considered in density calculations.
*   **(Alternative):** A separate array like `pData.recentDensityTrackedBlocks = [{x, y, z, typeId, tick}]` could be maintained specifically for this check, but enhancing `pData.recentBlockPlacements` is preferred for data consolidation if `checkTower`'s primary function isn't negatively impacted.

### 6.2. Detection Logic (`checkBlockSpamDensity`)

This new function would be called from `handlePlayerPlaceBlockAfterEvent`.

1.  **Configuration Checks:**
    *   If `!config.enableBlockSpamDensityCheck`, return.
    *   Bypass if player is in creative and `config.blockSpamBypassInCreative` is true (can share this config with rate check or have a specific one).

2.  **Volume Definition:**
    *   When a `newBlock` is placed by the player.
    *   Define a cubic volume centered on `newBlock.location`. The radius `R` is `config.blockSpamDensityCheckRadius`.
    *   The volume dimensions are `(2*R + 1) x (2*R + 1) x (2*R + 1)`.
    *   Total potential block locations in this volume: `totalVolumeBlocks = Math.pow((2 * R + 1), 3)`.

3.  **Counting Relevant Recent Blocks in Volume:**
    *   Initialize `playerPlacedBlocksInVolumeCount = 0`.
    *   Iterate through `pData.recentBlockPlacements`:
        *   For each `record` in `pData.recentBlockPlacements`:
            *   **Recency Filter:** Check if `currentTick - record.tick <= config.blockSpamDensityTimeWindowTicks`. If too old, skip.
            *   **Location Filter:** Check if `record.x, record.y, record.z` falls within the defined cubic volume around `newBlock.location`.
            *   **Type Filter (Optional):** If `config.blockSpamDensityMonitoredBlockTypes` is not empty, check if `record.typeId` is in this list. If not, skip.
            *   If all filters pass, increment `playerPlacedBlocksInVolumeCount`.

4.  **Thresholding:**
    *   Calculate `densityPercentage = (playerPlacedBlocksInVolumeCount / totalVolumeBlocks) * 100`.
    *   If `densityPercentage > config.blockSpamDensityThresholdPercentage`:
        *   Trigger `actionManager.executeCheckAction("world_antigrief_blockspam_density", player, violationDetails, dependencies)`.
        *   `violationDetails` to include: `densityPercentage`, `radius`, `countInVolume`, `totalVolumeBlocks`, `blockType` of the `newBlock`.

### 6.3. New Configuration Options (for Density Check):

*   `enableBlockSpamDensityCheck` (boolean, default: `false`)
*   `blockSpamDensityCheckRadius` (number, e.g., 1 for 3x3x3, 2 for 5x5x5. Default: `1`)
*   `blockSpamDensityTimeWindowTicks` (number): How far back in ticks to look in `recentBlockPlacements`. Default: `60` (3 seconds).
*   `blockSpamDensityThresholdPercentage` (number): Percentage of volume filled by player's recent blocks to trigger. Default: `70`.
*   `blockSpamDensityMonitoredBlockTypes` (array of strings): Specific blocks to count for density. Can reuse `blockSpamMonitoredBlockTypes` or be a separate list. Default: `[]` (monitor all).
*   `blockSpamDensityAction` (string): Action profile. Default: `"warn"`. (Could be a sub-profile or share with rate-based spam).

### 6.4. Performance:
The check iterates `towerPlacementHistoryLength` blocks and performs coordinate comparisons. For small radii (R=1, R=2) and history length (~20), this should be acceptable per block placement.
