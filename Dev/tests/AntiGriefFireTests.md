# Anti-Grief Fire Control (Initial Ignition) - Conceptual Test Cases

## Test Case Structure:
1.  **Test Case ID:** Unique identifier.
2.  **Description:** What the test case is verifying.
3.  **Prerequisites/Setup:**
    *   Relevant `config.js` settings.
    *   Player type (Non-Admin, Admin, Owner).
4.  **Action:** Action performed (e.g., Player attempts to use Flint & Steel or Fire Charge).
5.  **Expected Outcome:**
    *   Event cancelled/allowed (fire started/prevented).
    *   Player messages.
    *   Admin notifications (conceptual).
    *   Log entry details (conceptual).
    *   Player flags (conceptual).

---

## Scenario 1: `fireControlAction: "extinguish"` (Default)

### AG_FIRE_001
*   **Test Case ID:** AG_FIRE_001
*   **Description:** Verify Non-Admin fire starting with Flint & Steel is prevented when `fireControlAction` is "extinguish".
*   **Prerequisites/Setup:**
    *   `config.enableFireAntiGrief: true`
    *   `config.allowAdminFire: true`
    *   `config.fireControlAction: "extinguish"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:flint_and_steel' on a block.
*   **Expected Outcome:**
    *   Item use event is cancelled (`eventData.cancel = true`). Fire is not started.
    *   Player receives message: "§c[AntiGrief] Fire starting is restricted here."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Fire event involving {PlayerName}. Action: extinguish. Details: Player {PlayerName} attempted to start a fire with minecraft:flint_and_steel on {BlockType}. Action: extinguish" (or similar based on `violationDetails`).
    *   Log entry created (via `actionManager`): ActionType "antigrief_fire_incident", Details "AntiGrief Fire: Player {PlayerName} attempted to start a fire with minecraft:flint_and_steel on {BlockType}. Action: extinguish".
    *   Player receives flag (via `actionManager`): type "antigrief_fire", reason "Player involved in unauthorized or excessive fire incident.".

### AG_FIRE_002
*   **Test Case ID:** AG_FIRE_002
*   **Description:** Verify Admin fire starting with Flint & Steel is allowed when `fireControlAction` is "extinguish" and `allowAdminFire` is true.
*   **Prerequisites/Setup:**
    *   `config.enableFireAntiGrief: true`
    *   `config.allowAdminFire: true`
    *   `config.fireControlAction: "extinguish"`
    *   Player is Admin.
*   **Action:** Player attempts to use 'minecraft:flint_and_steel' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Fire is started.
    *   No message sent to the player from anti-grief.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added to the player.

### AG_FIRE_003
*   **Test Case ID:** AG_FIRE_003
*   **Description:** Verify Owner fire starting with Flint & Steel is allowed when `fireControlAction` is "extinguish" and `allowAdminFire` is true.
*   **Prerequisites/Setup:**
    *   `config.enableFireAntiGrief: true`
    *   `config.allowAdminFire: true`
    *   `config.fireControlAction: "extinguish"`
    *   Player is Owner.
*   **Action:** Player attempts to use 'minecraft:flint_and_steel' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Fire is started.
    *   No message sent to the player from anti-grief.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added to the player.

### AG_FIRE_004
*   **Test Case ID:** AG_FIRE_004
*   **Description:** Verify Non-Admin fire starting with Fire Charge is prevented when `fireControlAction` is "extinguish" and `allowAdminFire` is false.
*   **Prerequisites/Setup:**
    *   `config.enableFireAntiGrief: true`
    *   `config.allowAdminFire: false`
    *   `config.fireControlAction: "extinguish"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:fire_charge' on a block.
*   **Expected Outcome:**
    *   Item use event is cancelled (`eventData.cancel = true`). Fire is not started.
    *   Player receives message: "§c[AntiGrief] Fire starting is restricted here."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Fire event involving {PlayerName}. Action: extinguish. Details: Player {PlayerName} attempted to start a fire with minecraft:fire_charge on {BlockType}. Action: extinguish".
    *   Log entry created (via `actionManager`): ActionType "antigrief_fire_incident", Details "AntiGrief Fire: Player {PlayerName} attempted to start a fire with minecraft:fire_charge on {BlockType}. Action: extinguish".
    *   Player receives flag (via `actionManager`): type "antigrief_fire", reason "Player involved in unauthorized or excessive fire incident.".

### AG_FIRE_005
*   **Test Case ID:** AG_FIRE_005
*   **Description:** Verify Admin fire starting with Fire Charge is also prevented when `fireControlAction` is "extinguish" and `allowAdminFire` is false.
*   **Prerequisites/Setup:**
    *   `config.enableFireAntiGrief: true`
    *   `config.allowAdminFire: false`
    *   `config.fireControlAction: "extinguish"`
    *   Player is Admin.
*   **Action:** Player attempts to use 'minecraft:fire_charge' on a block.
*   **Expected Outcome:**
    *   Item use event is cancelled (`eventData.cancel = true`). Fire is not started.
    *   Player receives message: "§c[AntiGrief] Fire starting is restricted here."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Fire event involving {PlayerName}. Action: extinguish. Details: Player {PlayerName} attempted to start a fire with minecraft:fire_charge on {BlockType}. Action: extinguish".
    *   Log entry created (via `actionManager`): ActionType "antigrief_fire_incident", Details "AntiGrief Fire: Player {PlayerName} attempted to start a fire with minecraft:fire_charge on {BlockType}. Action: extinguish".
    *   Player receives flag (via `actionManager`): type "antigrief_fire", reason "Player involved in unauthorized or excessive fire incident.".

---

## Scenario 2: `fireControlAction: "warn"`

### AG_FIRE_006
*   **Test Case ID:** AG_FIRE_006
*   **Description:** Verify Non-Admin fire starting with Flint & Steel is allowed but warned when `fireControlAction` is "warn".
*   **Prerequisites/Setup:**
    *   `config.enableFireAntiGrief: true`
    *   `config.allowAdminFire: true`
    *   `config.fireControlAction: "warn"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:flint_and_steel' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Fire is started.
    *   Player receives message: "§e[AntiGrief] Warning: Fire starting is monitored."
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Fire event involving {PlayerName}. Action: warn. Details: Player {PlayerName} attempted to start a fire with minecraft:flint_and_steel on {BlockType}. Action: warn".
    *   Log entry created (via `actionManager`): ActionType "antigrief_fire_incident", Details "AntiGrief Fire: Player {PlayerName} attempted to start a fire with minecraft:flint_and_steel on {BlockType}. Action: warn".
    *   Player receives flag (via `actionManager`): type "antigrief_fire", reason "Player involved in unauthorized or excessive fire incident.".

---

## Scenario 3: `fireControlAction: "logOnly"`

### AG_FIRE_007
*   **Test Case ID:** AG_FIRE_007
*   **Description:** Verify Non-Admin fire starting with Fire Charge is allowed and only logged/notified when `fireControlAction` is "logOnly".
*   **Prerequisites/Setup:**
    *   `config.enableFireAntiGrief: true`
    *   `config.allowAdminFire: true`
    *   `config.fireControlAction: "logOnly"`
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:fire_charge' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Fire is started.
    *   No direct message sent to the player from the handler for this action.
    *   Admins notified (via `actionManager`): "§eAC [AntiGrief]: Fire event involving {PlayerName}. Action: logOnly. Details: Player {PlayerName} attempted to start a fire with minecraft:fire_charge on {BlockType}. Action: logOnly".
    *   Log entry created (via `actionManager`): ActionType "antigrief_fire_incident", Details "AntiGrief Fire: Player {PlayerName} attempted to start a fire with minecraft:fire_charge on {BlockType}. Action: logOnly".
    *   Player receives flag (via `actionManager`): type "antigrief_fire", reason "Player involved in unauthorized or excessive fire incident.".

---

## Scenario 4: Feature Disabled

### AG_FIRE_008
*   **Test Case ID:** AG_FIRE_008
*   **Description:** Verify Non-Admin fire starting with Flint & Steel is allowed without any anti-grief action when `enableFireAntiGrief` is false.
*   **Prerequisites/Setup:**
    *   `config.enableFireAntiGrief: false`
    *   `config.allowAdminFire: true` (should not matter)
    *   `config.fireControlAction: "extinguish"` (should not matter)
    *   Player is Non-Admin.
*   **Action:** Player attempts to use 'minecraft:flint_and_steel' on a block.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Fire is started.
    *   No message sent to the player from anti-grief.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added to the player.

---
