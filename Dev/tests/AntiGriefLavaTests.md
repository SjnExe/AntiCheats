# Anti-Grief Lava Control (Bucket Use) - Conceptual Test Cases

## Test Case Structure:
1.  **Test Case ID:** Unique identifier.
2.  **Description:** What the test case is verifying.
3.  **Prerequisites/Setup:**
    *   Relevant `config.js` settings.
    *   Player type (Non-Admin, Admin, Owner).
4.  **Action:** Action performed (e.g., Player attempts to use a lava bucket).
5.  **Expected Outcome:**
    *   Event cancelled/allowed (lava placed/prevented).
    *   Player messages.
    *   Admin notifications (conceptual).
    *   Log entry details (conceptual).
    *   Player flags (conceptual).

---

## Scenario 1: `lavaPlacementAction: "remove"` (Default)

### AG_LAVA_001
*   **Test Case ID:** AG_LAVA_001
*   **Description:** Verify Non-Admin lava bucket placement is prevented when `lavaPlacementAction` is "remove".
*   **Prerequisites/Setup:**
    *   `config.enableLavaAntiGrief: true`
    *   `config.allowAdminLava: true`
    *   `config.lavaPlacementAction: "remove"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:lava_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is cancelled (`eventData.cancel = true`). Lava is not placed.
    *   Player receives message: "§c[AntiGrief] Lava placement is restricted here."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Lava placement event involving {PlayerName}. Action: remove. Details: Player {PlayerName} attempted to place lava with minecraft:lava_bucket on {BlockType}. Action: remove" (or similar based on `violationDetails`).
    *   Log entry created (via `actionManager`): ActionType "antigrief_lava_placement", Details "AntiGrief Lava: Player {PlayerName} attempted to place lava with minecraft:lava_bucket on {BlockType}. Action: remove".
    *   Player receives flag (via `actionManager`): type "antigrief_lava", reason "Player involved in unauthorized lava placement.".

### AG_LAVA_002
*   **Test Case ID:** AG_LAVA_002
*   **Description:** Verify Admin lava bucket placement is allowed when `lavaPlacementAction` is "remove" and `allowAdminLava` is true.
*   **Prerequisites/Setup:**
    *   `config.enableLavaAntiGrief: true`
    *   `config.allowAdminLava: true`
    *   `config.lavaPlacementAction: "remove"`
    *   Player is Admin.
*   **Action:** Player attempts to use 'minecraft:lava_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Lava is placed.
    *   No message sent to the player from anti-grief.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added to the player.

### AG_LAVA_003
*   **Test Case ID:** AG_LAVA_003
*   **Description:** Verify Owner lava bucket placement is allowed when `lavaPlacementAction` is "remove" and `allowAdminLava` is true.
*   **Prerequisites/Setup:**
    *   `config.enableLavaAntiGrief: true`
    *   `config.allowAdminLava: true`
    *   `config.lavaPlacementAction: "remove"`
    *   Player is Owner.
*   **Action:** Player attempts to use 'minecraft:lava_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Lava is placed.
    *   No message sent to the player from anti-grief.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added to the player.

### AG_LAVA_004
*   **Test Case ID:** AG_LAVA_004
*   **Description:** Verify Non-Admin lava bucket placement is prevented when `lavaPlacementAction` is "remove" and `allowAdminLava` is false.
*   **Prerequisites/Setup:**
    *   `config.enableLavaAntiGrief: true`
    *   `config.allowAdminLava: false`
    *   `config.lavaPlacementAction: "remove"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:lava_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is cancelled (`eventData.cancel = true`). Lava is not placed.
    *   Player receives message: "§c[AntiGrief] Lava placement is restricted here."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Lava placement event involving {PlayerName}. Action: remove. Details: Player {PlayerName} attempted to place lava with minecraft:lava_bucket on {BlockType}. Action: remove".
    *   Log entry created (via `actionManager`): ActionType "antigrief_lava_placement", Details "AntiGrief Lava: Player {PlayerName} attempted to place lava with minecraft:lava_bucket on {BlockType}. Action: remove".
    *   Player receives flag (via `actionManager`): type "antigrief_lava", reason "Player involved in unauthorized lava placement.".

### AG_LAVA_005
*   **Test Case ID:** AG_LAVA_005
*   **Description:** Verify Admin lava bucket placement is also prevented when `lavaPlacementAction` is "remove" and `allowAdminLava` is false.
*   **Prerequisites/Setup:**
    *   `config.enableLavaAntiGrief: true`
    *   `config.allowAdminLava: false`
    *   `config.lavaPlacementAction: "remove"`
    *   Player is Admin.
*   **Action:** Player attempts to use 'minecraft:lava_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is cancelled (`eventData.cancel = true`). Lava is not placed.
    *   Player receives message: "§c[AntiGrief] Lava placement is restricted here."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Lava placement event involving {PlayerName}. Action: remove. Details: Player {PlayerName} attempted to place lava with minecraft:lava_bucket on {BlockType}. Action: remove".
    *   Log entry created (via `actionManager`): ActionType "antigrief_lava_placement", Details "AntiGrief Lava: Player {PlayerName} attempted to place lava with minecraft:lava_bucket on {BlockType}. Action: remove".
    *   Player receives flag (via `actionManager`): type "antigrief_lava", reason "Player involved in unauthorized lava placement.".

---

## Scenario 2: `lavaPlacementAction: "warn"`

### AG_LAVA_006
*   **Test Case ID:** AG_LAVA_006
*   **Description:** Verify Non-Admin lava bucket placement is allowed but warned when `lavaPlacementAction` is "warn".
*   **Prerequisites/Setup:**
    *   `config.enableLavaAntiGrief: true`
    *   `config.allowAdminLava: true`
    *   `config.lavaPlacementAction: "warn"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:lava_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Lava is placed.
    *   Player receives message: "§e[AntiGrief] Warning: Lava placement is monitored."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Lava placement event involving {PlayerName}. Action: warn. Details: Player {PlayerName} attempted to place lava with minecraft:lava_bucket on {BlockType}. Action: warn".
    *   Log entry created (via `actionManager`): ActionType "antigrief_lava_placement", Details "AntiGrief Lava: Player {PlayerName} attempted to place lava with minecraft:lava_bucket on {BlockType}. Action: warn".
    *   Player receives flag (via `actionManager`): type "antigrief_lava", reason "Player involved in unauthorized lava placement.".

---

## Scenario 3: `lavaPlacementAction: "logOnly"`

### AG_LAVA_007
*   **Test Case ID:** AG_LAVA_007
*   **Description:** Verify Non-Admin lava bucket placement is allowed and only logged/notified when `lavaPlacementAction` is "logOnly".
*   **Prerequisites/Setup:**
    *   `config.enableLavaAntiGrief: true`
    *   `config.allowAdminLava: true`
    *   `config.lavaPlacementAction: "logOnly"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:lava_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Lava is placed.
    *   No direct message sent to the player from the handler for this action.
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Lava placement event involving {PlayerName}. Action: logOnly. Details: Player {PlayerName} attempted to place lava with minecraft:lava_bucket on {BlockType}. Action: logOnly".
    *   Log entry created (via `actionManager`): ActionType "antigrief_lava_placement", Details "AntiGrief Lava: Player {PlayerName} attempted to place lava with minecraft:lava_bucket on {BlockType}. Action: logOnly".
    *   Player receives flag (via `actionManager`): type "antigrief_lava", reason "Player involved in unauthorized lava placement.".

---

## Scenario 4: Feature Disabled

### AG_LAVA_008
*   **Test Case ID:** AG_LAVA_008
*   **Description:** Verify Non-Admin lava bucket placement is allowed without any anti-grief action when `enableLavaAntiGrief` is false.
*   **Prerequisites/Setup:**
    *   `config.enableLavaAntiGrief: false`
    *   `config.allowAdminLava: true` (should not matter)
    *   `config.lavaPlacementAction: "remove"` (should not matter)
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:lava_bucket' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Lava is placed.
    *   No message sent to the player from anti-grief.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added to the player.

---
