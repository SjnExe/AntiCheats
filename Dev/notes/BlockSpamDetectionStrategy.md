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
