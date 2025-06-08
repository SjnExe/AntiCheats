# Anti-Grief Block Spam Control (Initial Rate-Based) - Conceptual Test Cases

## Test Case Structure:
1.  **Test Case ID:** Unique identifier.
2.  **Description:** What the test case is verifying.
3.  **Prerequisites/Setup:**
    *   Relevant `config.js` settings.
    *   Player type (Non-Admin, Admin, Owner).
    *   Player game mode (Survival, Creative).
    *   Content of `blockSpamMonitoredBlockTypes`.
4.  **Action:** Action performed (e.g., Player places blocks rapidly).
5.  **Expected Outcome:**
    *   Flags added (conceptual).
    *   Player messages (if applicable based on action).
    *   Admin notifications (conceptual).
    *   Log entry details (conceptual).

---

## Scenario 1: Basic Spam Detection (All Block Types Monitored)

### AG_BS_001
*   **Test Case ID:** AG_BS_001
*   **Description:** Verify Non-Admin rapid block placement (any type, Survival mode) triggers a warning.
*   **Prerequisites/Setup:**
    *   `config.enableBlockSpamAntiGrief: true`
    *   `config.blockSpamBypassInCreative: true`
    *   `config.blockSpamTimeWindowMs: 1000`
    *   `config.blockSpamMaxBlocksInWindow: 8`
    *   `config.blockSpamMonitoredBlockTypes: []` (empty, so all blocks counted)
    *   `config.blockSpamAction: "warn"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player places 9 blocks of any type (e.g., "minecraft:dirt") within 1000ms.
*   **Expected Outcome:**
    *   Player is flagged (via `actionManager`). Flag type "antigrief_blockspam", reason "Player suspected of block spamming.".
    *   Admins notified (via `actionManager` from "world_antigrief_blockspam" profile): "§eAC [AntiGrief]: {PlayerName} suspected of Block Spam. Blocks: 9/8 in 1000ms. Type: {blockTypeLastPlaced}. Action: warn."
    *   Log entry created (via `actionManager`): ActionType "antigrief_blockspam_detected", Details "AntiGrief BlockSpam: Player {PlayerName} suspected of Block Spam. Blocks: 9/8 in 1000ms. Type: {blockTypeLastPlaced}. Action: warn.".
    *   Player may receive a warning message if the "world_antigrief_blockspam" profile's "warn" action is configured to message the player (current implementation of `checkBlockSpam` defers to `actionManager`).

### AG_BS_002
*   **Test Case ID:** AG_BS_002
*   **Description:** Verify Admin rapid block placement (Survival mode) is not flagged by `checkBlockSpam` if `blockSpamBypassInCreative` is true (as this bypass only applies to Creative). The check itself does not have a generic admin bypass for Survival mode actions.
*   **Prerequisites/Setup:**
    *   `config.enableBlockSpamAntiGrief: true`
    *   `config.blockSpamBypassInCreative: true`
    *   `config.blockSpamTimeWindowMs: 1000`
    *   `config.blockSpamMaxBlocksInWindow: 8`
    *   `config.blockSpamMonitoredBlockTypes: []`
    *   `config.blockSpamAction: "warn"`
    *   Player is Admin, in Survival mode.
*   **Action:** Player places 9 blocks of "minecraft:cobblestone" within 1000ms.
*   **Expected Outcome:**
    *   Player is flagged (via `actionManager`). Flag type "antigrief_blockspam".
    *   Admins notified.
    *   Log entry created.
    *   *(Note: `checkBlockSpam` doesn't have a built-in admin check for non-creative mode. Admin bypass for specific actions would typically be handled at a higher level, e.g., command permissions or if the `actionManager` profile for `world_antigrief_blockspam` is configured to ignore admins for certain actions like "warn".)*

### AG_BS_003
*   **Test Case ID:** AG_BS_003
*   **Description:** Verify Non-Admin rapid block placement in Creative mode is bypassed.
*   **Prerequisites/Setup:**
    *   `config.enableBlockSpamAntiGrief: true`
    *   `config.blockSpamBypassInCreative: true`
    *   `config.blockSpamTimeWindowMs: 1000`
    *   `config.blockSpamMaxBlocksInWindow: 8`
    *   `config.blockSpamMonitoredBlockTypes: []`
    *   `config.blockSpamAction: "warn"`
    *   Player is Non-Admin, in Creative mode.
*   **Action:** Player places 9 blocks of "minecraft:wool" within 1000ms.
*   **Expected Outcome:**
    *   No flag added from `checkBlockSpam`.
    *   No admin notification from `checkBlockSpam`.
    *   No log entry from `checkBlockSpam`.
    *   No player message.

### AG_BS_004
*   **Test Case ID:** AG_BS_004
*   **Description:** Verify Non-Admin rapid block placement (Survival mode) triggers warning when creative bypass is disabled.
*   **Prerequisites/Setup:**
    *   `config.enableBlockSpamAntiGrief: true`
    *   `config.blockSpamBypassInCreative: false`
    *   `config.blockSpamTimeWindowMs: 1000`
    *   `config.blockSpamMaxBlocksInWindow: 8`
    *   `config.blockSpamMonitoredBlockTypes: []`
    *   `config.blockSpamAction: "warn"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player places 9 blocks of "minecraft:sand" within 1000ms.
*   **Expected Outcome:**
    *   Player is flagged (via `actionManager`).
    *   Admins notified.
    *   Log entry created.

---

## Scenario 2: Monitored Block Types

### AG_BS_005
*   **Test Case ID:** AG_BS_005
*   **Description:** Verify Non-Admin rapid placement of monitored blocks triggers a warning.
*   **Prerequisites/Setup:**
    *   `config.enableBlockSpamAntiGrief: true`
    *   `config.blockSpamBypassInCreative: true`
    *   `config.blockSpamTimeWindowMs: 1000`
    *   `config.blockSpamMaxBlocksInWindow: 8`
    *   `config.blockSpamMonitoredBlockTypes: ["minecraft:dirt", "minecraft:cobblestone"]`
    *   `config.blockSpamAction: "warn"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player places 9 blocks of "minecraft:dirt" within 1000ms.
*   **Expected Outcome:**
    *   Player is flagged (via `actionManager`).
    *   Admins notified, details should include "minecraft:dirt".
    *   Log entry created, details should include "minecraft:dirt".

### AG_BS_006
*   **Test Case ID:** AG_BS_006
*   **Description:** Verify Non-Admin rapid placement of non-monitored blocks does NOT trigger action.
*   **Prerequisites/Setup:**
    *   `config.enableBlockSpamAntiGrief: true`
    *   `config.blockSpamBypassInCreative: true`
    *   `config.blockSpamTimeWindowMs: 1000`
    *   `config.blockSpamMaxBlocksInWindow: 8`
    *   `config.blockSpamMonitoredBlockTypes: ["minecraft:dirt", "minecraft:cobblestone"]`
    *   `config.blockSpamAction: "warn"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player places 9 blocks of "minecraft:stone" within 1000ms.
*   **Expected Outcome:**
    *   No flag added from `checkBlockSpam`.
    *   No admin notification from `checkBlockSpam`.
    *   No log entry from `checkBlockSpam`.

### AG_BS_007
*   **Test Case ID:** AG_BS_007
*   **Description:** Verify Non-Admin rapid placement of mixed blocks (monitored count exceeds threshold) triggers a warning.
*   **Prerequisites/Setup:**
    *   `config.enableBlockSpamAntiGrief: true`
    *   `config.blockSpamBypassInCreative: true`
    *   `config.blockSpamTimeWindowMs: 1000`
    *   `config.blockSpamMaxBlocksInWindow: 3` (Lowered for easier testing of this mix)
    *   `config.blockSpamMonitoredBlockTypes: ["minecraft:netherrack"]`
    *   `config.blockSpamAction: "warn"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player places blocks in sequence within 1000ms: Stone, Netherrack, Stone, Netherrack, Stone, Netherrack, Stone, Netherrack (4 Netherrack).
*   **Expected Outcome:**
    *   Player is flagged (via `actionManager`).
    *   Admins notified, details should include "minecraft:netherrack" (as the last monitored block that pushed count over).
    *   Log entry created, details should include "minecraft:netherrack".
    *   The count in the notification/log should reflect the number of monitored blocks (4 in this case).

---

## Scenario 3: Different Actions

### AG_BS_008
*   **Test Case ID:** AG_BS_008
*   **Description:** Verify Non-Admin rapid block placement triggers "logOnly" action correctly.
*   **Prerequisites/Setup:**
    *   `config.enableBlockSpamAntiGrief: true`
    *   `config.blockSpamBypassInCreative: true`
    *   `config.blockSpamTimeWindowMs: 1000`
    *   `config.blockSpamMaxBlocksInWindow: 8`
    *   `config.blockSpamMonitoredBlockTypes: []`
    *   `config.blockSpamAction: "logOnly"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player places 9 blocks of "minecraft:gravel" within 1000ms.
*   **Expected Outcome:**
    *   Player is flagged (via `actionManager`).
    *   Admins notified (via `actionManager` from "world_antigrief_blockspam" profile): "§eAC [AntiGrief]: {PlayerName} suspected of Block Spam. Blocks: 9/8 in 1000ms. Type: minecraft:gravel. Action: logOnly."
    *   Log entry created (via `actionManager`).
    *   No message sent directly to the player from `checkBlockSpam`.

---

## Scenario 4: Feature Disabled

### AG_BS_009
*   **Test Case ID:** AG_BS_009
*   **Description:** Verify Non-Admin rapid block placement results in no action when feature is disabled.
*   **Prerequisites/Setup:**
    *   `config.enableBlockSpamAntiGrief: false`
    *   `config.blockSpamBypassInCreative: true`
    *   `config.blockSpamTimeWindowMs: 1000`
    *   `config.blockSpamMaxBlocksInWindow: 8`
    *   `config.blockSpamMonitoredBlockTypes: []`
    *   `config.blockSpamAction: "warn"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player places 9 blocks of "minecraft:sandstone" within 1000ms.
*   **Expected Outcome:**
    *   No flag added.
    *   No admin notification.
    *   No log entry.
    *   No player message.

---
