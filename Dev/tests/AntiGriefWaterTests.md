# Anti-Grief Water Control (Bucket Use) - Conceptual Test Cases

## Test Case Structure:
1.  **Test Case ID:** Unique identifier.
2.  **Description:** What the test case is verifying.
3.  **Prerequisites/Setup:**
    *   Relevant `config.js` settings.
    *   Player type (Non-Admin, Admin, Owner).
4.  **Action:** Action performed (e.g., Player attempts to use a water bucket).
5.  **Expected Outcome:**
    *   Event cancelled/allowed (water placed/prevented).
    *   Player messages.
    *   Admin notifications (conceptual).
    *   Log entry details (conceptual).
    *   Player flags (conceptual).

---

## Scenario 1: `waterPlacementAction: "remove"` (Default)

### AG_WATER_001
*   **Test Case ID:** AG_WATER_001
*   **Description:** Verify Non-Admin water bucket placement is prevented when `waterPlacementAction` is "remove".
*   **Prerequisites/Setup:**
    *   `config.enableWaterAntiGrief: true`
    *   `config.allowAdminWater: true`
    *   `config.waterPlacementAction: "remove"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:water_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is cancelled (`eventData.cancel = true`). Water is not placed.
    *   Player receives message: "§c[AntiGrief] Water placement is restricted here."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Water placement event involving {PlayerName}. Action: remove. Details: Player {PlayerName} attempted to place water with minecraft:water_bucket on {BlockType}. Action: remove" (or similar based on `violationDetails`).
    *   Log entry created (via `actionManager`): ActionType "antigrief_water_placement", Details "AntiGrief Water: Player {PlayerName} attempted to place water with minecraft:water_bucket on {BlockType}. Action: remove".
    *   Player receives flag (via `actionManager`): type "antigrief_water", reason "Player involved in unauthorized water placement.".

### AG_WATER_002
*   **Test Case ID:** AG_WATER_002
*   **Description:** Verify Admin water bucket placement is allowed when `waterPlacementAction` is "remove" and `allowAdminWater` is true.
*   **Prerequisites/Setup:**
    *   `config.enableWaterAntiGrief: true`
    *   `config.allowAdminWater: true`
    *   `config.waterPlacementAction: "remove"`
    *   Player is Admin.
*   **Action:** Player attempts to use 'minecraft:water_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Water is placed.
    *   No message sent to the player from anti-grief.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added to the player.

### AG_WATER_003
*   **Test Case ID:** AG_WATER_003
*   **Description:** Verify Owner water bucket placement is allowed when `waterPlacementAction` is "remove" and `allowAdminWater` is true.
*   **Prerequisites/Setup:**
    *   `config.enableWaterAntiGrief: true`
    *   `config.allowAdminWater: true`
    *   `config.waterPlacementAction: "remove"`
    *   Player is Owner.
*   **Action:** Player attempts to use 'minecraft:water_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Water is placed.
    *   No message sent to the player from anti-grief.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added to the player.

### AG_WATER_004
*   **Test Case ID:** AG_WATER_004
*   **Description:** Verify Non-Admin water bucket placement is prevented when `waterPlacementAction` is "remove" and `allowAdminWater` is false.
*   **Prerequisites/Setup:**
    *   `config.enableWaterAntiGrief: true`
    *   `config.allowAdminWater: false`
    *   `config.waterPlacementAction: "remove"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:water_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is cancelled (`eventData.cancel = true`). Water is not placed.
    *   Player receives message: "§c[AntiGrief] Water placement is restricted here."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Water placement event involving {PlayerName}. Action: remove. Details: Player {PlayerName} attempted to place water with minecraft:water_bucket on {BlockType}. Action: remove".
    *   Log entry created (via `actionManager`): ActionType "antigrief_water_placement", Details "AntiGrief Water: Player {PlayerName} attempted to place water with minecraft:water_bucket on {BlockType}. Action: remove".
    *   Player receives flag (via `actionManager`): type "antigrief_water", reason "Player involved in unauthorized water placement.".

### AG_WATER_005
*   **Test Case ID:** AG_WATER_005
*   **Description:** Verify Admin water bucket placement is also prevented when `waterPlacementAction` is "remove" and `allowAdminWater` is false.
*   **Prerequisites/Setup:**
    *   `config.enableWaterAntiGrief: true`
    *   `config.allowAdminWater: false`
    *   `config.waterPlacementAction: "remove"`
    *   Player is Admin.
*   **Action:** Player attempts to use 'minecraft:water_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is cancelled (`eventData.cancel = true`). Water is not placed.
    *   Player receives message: "§c[AntiGrief] Water placement is restricted here."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Water placement event involving {PlayerName}. Action: remove. Details: Player {PlayerName} attempted to place water with minecraft:water_bucket on {BlockType}. Action: remove".
    *   Log entry created (via `actionManager`): ActionType "antigrief_water_placement", Details "AntiGrief Water: Player {PlayerName} attempted to place water with minecraft:water_bucket on {BlockType}. Action: remove".
    *   Player receives flag (via `actionManager`): type "antigrief_water", reason "Player involved in unauthorized water placement.".

---

## Scenario 2: `waterPlacementAction: "warn"`

### AG_WATER_006
*   **Test Case ID:** AG_WATER_006
*   **Description:** Verify Non-Admin water bucket placement is allowed but warned when `waterPlacementAction` is "warn".
*   **Prerequisites/Setup:**
    *   `config.enableWaterAntiGrief: true`
    *   `config.allowAdminWater: true`
    *   `config.waterPlacementAction: "warn"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:water_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Water is placed.
    *   Player receives message: "§e[AntiGrief] Warning: Water placement is monitored."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Water placement event involving {PlayerName}. Action: warn. Details: Player {PlayerName} attempted to place water with minecraft:water_bucket on {BlockType}. Action: warn".
    *   Log entry created (via `actionManager`): ActionType "antigrief_water_placement", Details "AntiGrief Water: Player {PlayerName} attempted to place water with minecraft:water_bucket on {BlockType}. Action: warn".
    *   Player receives flag (via `actionManager`): type "antigrief_water", reason "Player involved in unauthorized water placement.".

---

## Scenario 3: `waterPlacementAction: "logOnly"`

### AG_WATER_007
*   **Test Case ID:** AG_WATER_007
*   **Description:** Verify Non-Admin water bucket placement is allowed and only logged/notified when `waterPlacementAction` is "logOnly".
*   **Prerequisites/Setup:**
    *   `config.enableWaterAntiGrief: true`
    *   `config.allowAdminWater: true`
    *   `config.waterPlacementAction: "logOnly"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:water_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Water is placed.
    *   No direct message sent to the player from the handler for this action.
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Water placement event involving {PlayerName}. Action: logOnly. Details: Player {PlayerName} attempted to place water with minecraft:water_bucket on {BlockType}. Action: logOnly".
    *   Log entry created (via `actionManager`): ActionType "antigrief_water_placement", Details "AntiGrief Water: Player {PlayerName} attempted to place water with minecraft:water_bucket on {BlockType}. Action: logOnly".
    *   Player receives flag (via `actionManager`): type "antigrief_water", reason "Player involved in unauthorized water placement.".

---

## Scenario 4: Feature Disabled

### AG_WATER_008
*   **Test Case ID:** AG_WATER_008
*   **Description:** Verify Non-Admin water bucket placement is allowed without any anti-grief action when `enableWaterAntiGrief` is false.
*   **Prerequisites/Setup:**
    *   `config.enableWaterAntiGrief: false`
    *   `config.allowAdminWater: true` (should not matter)
    *   `config.waterPlacementAction: "remove"` (should not matter)
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:water_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Water is placed.
    *   No message sent to the player from anti-grief.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added to the player.

---
