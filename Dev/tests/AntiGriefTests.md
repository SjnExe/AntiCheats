# Anti-Grief TNT Control Feature - Conceptual Test Cases

## Test Case Structure:
1.  **Test Case ID:** Unique identifier.
2.  **Description:** What the test case is verifying.
3.  **Prerequisites/Setup:**
    *   Relevant `config.js` settings.
    *   Player type (Non-Admin, Admin, Owner).
4.  **Action:** Action performed.
5.  **Expected Outcome:**
    *   TNT placement allowed/cancelled.
    *   Player messages.
    *   Admin notifications (conceptual).
    *   Log entry details (conceptual).
    *   Player flags (conceptual).

---

## Scenario 1: `tntPlacementAction: "remove"` (Default)

### AG_TNT_001
*   **Test Case ID:** AG_TNT_001
*   **Description:** Verify Non-Admin TNT placement is removed when `tntPlacementAction` is "remove" and admins are allowed by default.
*   **Prerequisites/Setup:**
    *   `config.enableTntAntiGrief: true`
    *   `config.allowAdminTntPlacement: true`
    *   `config.tntPlacementAction: "remove"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to place a `minecraft:tnt` block.
*   **Expected Outcome:**
    *   TNT placement is cancelled (`eventData.cancel = true`).
    *   Player receives message: "§c[AntiGrief] TNT placement is restricted here."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: {PlayerName} attempted to place TNT at {x},{y},{z}. Action: remove."
    *   Log entry created (via `actionManager`): ActionType "antigrief_tnt_placement", Details "AntiGrief TNT: Player {PlayerName} tried to place TNT at {x},{y},{z}. Action: remove".
    *   Player receives flag (via `actionManager`): type "antigrief_tnt", reason "Player attempted to place TNT without authorization."

### AG_TNT_002
*   **Test Case ID:** AG_TNT_002
*   **Description:** Verify Admin TNT placement is allowed when `tntPlacementAction` is "remove" and `allowAdminTntPlacement` is true.
*   **Prerequisites/Setup:**
    *   `config.enableTntAntiGrief: true`
    *   `config.allowAdminTntPlacement: true`
    *   `config.tntPlacementAction: "remove"`
    *   Player is Admin.
*   **Action:** Player attempts to place a `minecraft:tnt` block.
*   **Expected Outcome:**
    *   TNT placement is allowed (`eventData.cancel` remains `false`).
    *   No message sent to the player.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added to the player.

### AG_TNT_003
*   **Test Case ID:** AG_TNT_003
*   **Description:** Verify Owner TNT placement is allowed when `tntPlacementAction` is "remove" and `allowAdminTntPlacement` is true.
*   **Prerequisites/Setup:**
    *   `config.enableTntAntiGrief: true`
    *   `config.allowAdminTntPlacement: true`
    *   `config.tntPlacementAction: "remove"`
    *   Player is Owner.
*   **Action:** Player attempts to place a `minecraft:tnt` block.
*   **Expected Outcome:**
    *   TNT placement is allowed (`eventData.cancel` remains `false`).
    *   No message sent to the player.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added to the player.

### AG_TNT_004
*   **Test Case ID:** AG_TNT_004
*   **Description:** Verify Non-Admin TNT placement is removed when `tntPlacementAction` is "remove" and `allowAdminTntPlacement` is false.
*   **Prerequisites/Setup:**
    *   `config.enableTntAntiGrief: true`
    *   `config.allowAdminTntPlacement: false`
    *   `config.tntPlacementAction: "remove"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to place a `minecraft:tnt` block.
*   **Expected Outcome:**
    *   TNT placement is cancelled (`eventData.cancel = true`).
    *   Player receives message: "§c[AntiGrief] TNT placement is restricted here."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: {PlayerName} attempted to place TNT at {x},{y},{z}. Action: remove."
    *   Log entry created (via `actionManager`): ActionType "antigrief_tnt_placement", Details "AntiGrief TNT: Player {PlayerName} tried to place TNT at {x},{y},{z}. Action: remove".
    *   Player receives flag (via `actionManager`): type "antigrief_tnt", reason "Player attempted to place TNT without authorization."

### AG_TNT_005
*   **Test Case ID:** AG_TNT_005
*   **Description:** Verify Admin TNT placement is also removed when `tntPlacementAction` is "remove" and `allowAdminTntPlacement` is false.
*   **Prerequisites/Setup:**
    *   `config.enableTntAntiGrief: true`
    *   `config.allowAdminTntPlacement: false`
    *   `config.tntPlacementAction: "remove"`
    *   Player is Admin.
*   **Action:** Player attempts to place a `minecraft:tnt` block.
*   **Expected Outcome:**
    *   TNT placement is cancelled (`eventData.cancel = true`).
    *   Player receives message: "§c[AntiGrief] TNT placement is restricted here."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: {PlayerName} attempted to place TNT at {x},{y},{z}. Action: remove."
    *   Log entry created (via `actionManager`): ActionType "antigrief_tnt_placement", Details "AntiGrief TNT: Player {PlayerName} tried to place TNT at {x},{y},{z}. Action: remove".
    *   Player receives flag (via `actionManager`): type "antigrief_tnt", reason "Player attempted to place TNT without authorization."

---

## Scenario 2: `tntPlacementAction: "warn"`

### AG_TNT_006
*   **Test Case ID:** AG_TNT_006
*   **Description:** Verify Non-Admin TNT placement is allowed but warned when `tntPlacementAction` is "warn".
*   **Prerequisites/Setup:**
    *   `config.enableTntAntiGrief: true`
    *   `config.allowAdminTntPlacement: true`
    *   `config.tntPlacementAction: "warn"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to place a `minecraft:tnt` block.
*   **Expected Outcome:**
    *   TNT placement is allowed (`eventData.cancel` remains `false`).
    *   Player receives message: "§e[AntiGrief] Warning: TNT placement is monitored."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: {PlayerName} attempted to place TNT at {x},{y},{z}. Action: warn."
    *   Log entry created (via `actionManager`): ActionType "antigrief_tnt_placement", Details "AntiGrief TNT: Player {PlayerName} tried to place TNT at {x},{y},{z}. Action: warn".
    *   Player receives flag (via `actionManager`): type "antigrief_tnt", reason "Player attempted to place TNT without authorization."

### AG_TNT_007
*   **Test Case ID:** AG_TNT_007
*   **Description:** Verify Admin TNT placement is also warned (but allowed) when `tntPlacementAction` is "warn" and `allowAdminTntPlacement` is false.
*   **Prerequisites/Setup:**
    *   `config.enableTntAntiGrief: true`
    *   `config.allowAdminTntPlacement: false`
    *   `config.tntPlacementAction: "warn"`
    *   Player is Admin.
*   **Action:** Player attempts to place a `minecraft:tnt` block.
*   **Expected Outcome:**
    *   TNT placement is allowed (`eventData.cancel` remains `false`).
    *   Player receives message: "§e[AntiGrief] Warning: TNT placement is monitored."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: {PlayerName} attempted to place TNT at {x},{y},{z}. Action: warn."
    *   Log entry created (via `actionManager`): ActionType "antigrief_tnt_placement", Details "AntiGrief TNT: Player {PlayerName} tried to place TNT at {x},{y},{z}. Action: warn".
    *   Player receives flag (via `actionManager`): type "antigrief_tnt", reason "Player attempted to place TNT without authorization."

---

## Scenario 3: `tntPlacementAction: "logOnly"`

### AG_TNT_008
*   **Test Case ID:** AG_TNT_008
*   **Description:** Verify Non-Admin TNT placement is allowed and only logged/notified when `tntPlacementAction` is "logOnly".
*   **Prerequisites/Setup:**
    *   `config.enableTntAntiGrief: true`
    *   `config.allowAdminTntPlacement: true`
    *   `config.tntPlacementAction: "logOnly"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to place a `minecraft:tnt` block.
*   **Expected Outcome:**
    *   TNT placement is allowed (`eventData.cancel` remains `false`).
    *   No message sent to the player directly from the handler.
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: {PlayerName} attempted to place TNT at {x},{y},{z}. Action: logOnly."
    *   Log entry created (via `actionManager`): ActionType "antigrief_tnt_placement", Details "AntiGrief TNT: Player {PlayerName} tried to place TNT at {x},{y},{z}. Action: logOnly".
    *   Player receives flag (via `actionManager`): type "antigrief_tnt", reason "Player attempted to place TNT without authorization."

### AG_TNT_009
*   **Test Case ID:** AG_TNT_009
*   **Description:** Verify Admin TNT placement is also only logged/notified (but allowed) when `tntPlacementAction` is "logOnly" and `allowAdminTntPlacement` is false.
*   **Prerequisites/Setup:**
    *   `config.enableTntAntiGrief: true`
    *   `config.allowAdminTntPlacement: false`
    *   `config.tntPlacementAction: "logOnly"`
    *   Player is Admin.
*   **Action:** Player attempts to place a `minecraft:tnt` block.
*   **Expected Outcome:**
    *   TNT placement is allowed (`eventData.cancel` remains `false`).
    *   No message sent to the player directly from the handler.
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: {PlayerName} attempted to place TNT at {x},{y},{z}. Action: logOnly."
    *   Log entry created (via `actionManager`): ActionType "antigrief_tnt_placement", Details "AntiGrief TNT: Player {PlayerName} tried to place TNT at {x},{y},{z}. Action: logOnly".
    *   Player receives flag (via `actionManager`): type "antigrief_tnt", reason "Player attempted to place TNT without authorization."

---

## Scenario 4: Feature Disabled

### AG_TNT_010
*   **Test Case ID:** AG_TNT_010
*   **Description:** Verify Non-Admin TNT placement is allowed without any anti-grief action when `enableTntAntiGrief` is false.
*   **Prerequisites/Setup:**
    *   `config.enableTntAntiGrief: false`
    *   `config.allowAdminTntPlacement: true` (should not matter)
    *   `config.tntPlacementAction: "remove"` (should not matter)
    *   Player is Non-Admin.
*   **Action:** Player attempts to place a `minecraft:tnt` block.
*   **Expected Outcome:**
    *   TNT placement is allowed (`eventData.cancel` remains `false`).
    *   No message sent to the player from anti-grief.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added to the player.

---
