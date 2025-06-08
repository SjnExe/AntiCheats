# Anti-Grief Entity Spam Control (Player-Initiated via Item Use) - Conceptual Test Cases

## Test Case Structure:
1.  **Test Case ID:** Unique identifier.
2.  **Description:** What the test case is verifying.
3.  **Prerequisites/Setup:**
    *   Relevant `config.js` settings.
    *   Player type (Non-Admin, Admin, Owner).
    *   Player game mode (Survival, Creative).
    *   Content of `entitySpamMonitoredEntityTypes`.
    *   Item used for placing/spawning the entity.
4.  **Action:** Action performed (e.g., Player attempts to use the specified item rapidly).
5.  **Expected Outcome:**
    *   Item use event cancelled/allowed (entity placed/spawned or prevented).
    *   Player messages.
    *   Admin notifications (conceptual).
    *   Log entry details (conceptual).
    *   Player flags (conceptual).

---

## Scenario 1: Placeable Item Spam (`itemUseOn`) - `entitySpamAction: "kill"` (Interpreted as "prevent")

### AG_ES_IUO_001
*   **Test Case ID:** AG_ES_IUO_001
*   **Description:** Verify Non-Admin rapid placement of `minecraft:oak_boat` (monitored as `minecraft:boat` entity) is prevented when action is "kill".
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: true`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 5`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:boat", "minecraft:armor_stand"]`
    *   `config.entitySpamAction: "kill"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player attempts to use `minecraft:oak_boat` item for the 6th time within 2000ms.
*   **Expected Outcome:**
    *   `itemUseOn` event is cancelled (`eventData.cancel = true`). Boat entity is not placed.
    *   Player receives message: "§c[AntiGrief] You are placing these items too quickly!"
    *   Detection is logged by `checkEntitySpam` via `actionManager` (profile `world_antigrief_entityspam`):
        *   Flag: type "antigrief_entityspam", reason "Player suspected of entity spamming.".
        *   Admin Notification: "§eAC [AntiGrief]: {PlayerName} suspected of Entity Spam. Entity: minecraft:boat. Count: 6/5 in 2000ms. Action: kill."
        *   Log Entry: ActionType "antigrief_entityspam_detected", Details "AntiGrief EntitySpam: Player {PlayerName} suspected of Entity Spam. Entity: minecraft:boat. Count: 6/5 in 2000ms. Action: kill.".

### AG_ES_IUO_002
*   **Test Case ID:** AG_ES_IUO_002
*   **Description:** Verify Admin rapid placement of `minecraft:armor_stand` in Creative mode is allowed due to `entitySpamBypassInCreative: true`.
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: true`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 5`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:boat", "minecraft:armor_stand"]`
    *   `config.entitySpamAction: "kill"`
    *   Player is Admin, in Creative mode.
*   **Action:** Player attempts to use `minecraft:armor_stand` item for the 6th time within 2000ms.
*   **Expected Outcome:**
    *   Item use event is allowed. Armor stand is placed.
    *   No anti-grief message to player.
    *   No anti-grief admin notification.
    *   No anti-grief log entry.
    *   No anti-grief flag.

### AG_ES_IUO_003
*   **Test Case ID:** AG_ES_IUO_003
*   **Description:** Verify Non-Admin rapid placement of `minecraft:oak_boat` in Creative mode is allowed due to `entitySpamBypassInCreative: true`.
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: true`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 5`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:boat", "minecraft:armor_stand"]`
    *   `config.entitySpamAction: "kill"`
    *   Player is Non-Admin, in Creative mode.
*   **Action:** Player attempts to use `minecraft:oak_boat` item for the 6th time within 2000ms.
*   **Expected Outcome:**
    *   Item use event is allowed. Boat entity is placed.
    *   No anti-grief message to player.
    *   No anti-grief admin notification.
    *   No anti-grief log entry.
    *   No anti-grief flag.

### AG_ES_IUO_004
*   **Test Case ID:** AG_ES_IUO_004
*   **Description:** Verify Non-Admin rapid placement of `minecraft:item_frame` in Survival is prevented when `entitySpamBypassInCreative: false`.
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: false`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 3`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:boat", "minecraft:item_frame"]`
    *   `config.entitySpamAction: "kill"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player attempts to use `minecraft:item_frame` item for the 4th time within 2000ms.
*   **Expected Outcome:**
    *   `itemUseOn` event is cancelled. Item frame is not placed.
    *   Player receives message: "§c[AntiGrief] You are placing these items too quickly!"
    *   Detection logged by `checkEntitySpam` via `actionManager` (profile `world_antigrief_entityspam`).

### AG_ES_IUO_005
*   **Test Case ID:** AG_ES_IUO_005
*   **Description:** Verify Non-Admin rapid placement of `minecraft:oak_boat` is NOT actioned if `minecraft:boat` entity type is not in `entitySpamMonitoredEntityTypes`.
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: true`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 5`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:armor_stand", "minecraft:item_frame"]` (note: `minecraft:boat` is excluded)
    *   `config.entitySpamAction: "kill"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player attempts to use `minecraft:oak_boat` item for the 6th time within 2000ms.
*   **Expected Outcome:**
    *   Item use event is allowed. Boat entity is placed.
    *   No anti-grief message to player.
    *   No anti-grief admin notification.
    *   No anti-grief log entry.
    *   No anti-grief flag.

---

## Scenario 2: Placeable Item Spam (`itemUseOn`) - `entitySpamAction: "warn"`

### AG_ES_IUO_006
*   **Test Case ID:** AG_ES_IUO_006
*   **Description:** Verify Non-Admin rapid placement of `minecraft:armor_stand` (monitored) results in a warning, but placement is allowed.
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: true`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 5`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:armor_stand"]`
    *   `config.entitySpamAction: "warn"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player attempts to use `minecraft:armor_stand` item for the 6th time within 2000ms.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Armor stand is placed.
    *   Player receives message: "§e[AntiGrief] Warning: Placing these items too quickly is monitored."
    *   Detection is logged by `checkEntitySpam` via `actionManager` (profile `world_antigrief_entityspam`):
        *   Flag: type "antigrief_entityspam", reason "Player suspected of entity spamming.".
        *   Admin Notification: "§eAC [AntiGrief]: {PlayerName} suspected of Entity Spam. Entity: minecraft:armor_stand. Count: 6/5 in 2000ms. Action: warn."
        *   Log Entry: ActionType "antigrief_entityspam_detected", Details "AntiGrief EntitySpam: Player {PlayerName} suspected of Entity Spam. Entity: minecraft:armor_stand. Count: 6/5 in 2000ms. Action: warn.".

---

## Scenario 3: Placeable Item Spam (`itemUseOn`) - `entitySpamAction: "logOnly"`

### AG_ES_IUO_007
*   **Test Case ID:** AG_ES_IUO_007
*   **Description:** Verify Non-Admin rapid placement of `minecraft:oak_boat` (monitored) is allowed, with no player message, only admin/log actions.
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: true`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 5`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:boat"]`
    *   `config.entitySpamAction: "logOnly"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player attempts to use `minecraft:oak_boat` item for the 6th time within 2000ms.
*   **Expected Outcome:**
    *   Item use event is allowed (`eventData.cancel` remains `false`). Boat entity is placed.
    *   No direct message sent to the player from the handler for this action.
    *   Detection is logged by `checkEntitySpam` via `actionManager` (profile `world_antigrief_entityspam`):
        *   Flag: type "antigrief_entityspam", reason "Player suspected of entity spamming.".
        *   Admin Notification: "§eAC [AntiGrief]: {PlayerName} suspected of Entity Spam. Entity: minecraft:boat. Count: 6/5 in 2000ms. Action: logOnly."
        *   Log Entry: ActionType "antigrief_entityspam_detected", Details "AntiGrief EntitySpam: Player {PlayerName} suspected of Entity Spam. Entity: minecraft:boat. Count: 6/5 in 2000ms. Action: logOnly.".

---

## Scenario 4: Placeable Item Spam (`itemUseOn`) - Feature Disabled

### AG_ES_IUO_008
*   **Test Case ID:** AG_ES_IUO_008
*   **Description:** Verify Non-Admin rapid placement of `minecraft:oak_boat` results in no action when `enableEntitySpamAntiGrief` is false.
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: false`
    *   `config.entitySpamBypassInCreative: true` (should not matter)
    *   `config.entitySpamTimeWindowMs: 2000` (should not matter)
    *   `config.entitySpamMaxSpawnsInWindow: 5` (should not matter)
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:boat"]` (should not matter)
    *   `config.entitySpamAction: "kill"` (should not matter)
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player attempts to use `minecraft:oak_boat` item for the 6th time within 2000ms.
*   **Expected Outcome:**
    *   Item use event is allowed. Boat entity is placed.
    *   No anti-grief message to player.
    *   No anti-grief admin notification.
    *   No anti-grief log entry.
    *   No anti-grief flag.

---
## Scenario 5: Spawn Egg Spam (`itemUse`/`itemUseOn`) - `entitySpamAction: "kill"` (Prevent Use)

### AG_ES_SE_001
*   **Test Case ID:** AG_ES_SE_001
*   **Description:** Verify Non-Admin rapid use of `minecraft:pig_spawn_egg` (monitored as `minecraft:pig` entity) is prevented when action is "kill".
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: true`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 3`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:pig", "minecraft:boat"]`
    *   `config.entitySpamAction: "kill"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player attempts to use `minecraft:pig_spawn_egg` item for the 4th time within 2000ms (via `itemUse` or `itemUseOn`).
*   **Expected Outcome:**
    *   `itemUse`/`itemUseOn` event is cancelled (`eventData.cancel = true`). Pig entity is not spawned.
    *   Player receives message: "§c[AntiGrief] You are using spawn eggs too quickly!"
    *   Detection is logged by `checkEntitySpam` via `actionManager` (profile `world_antigrief_entityspam`):
        *   Flag: type "antigrief_entityspam", reason "Player suspected of entity spamming."
        *   Admin Notification: "§eAC [AntiGrief]: {PlayerName} suspected of Entity Spam. Entity: minecraft:pig. Count: 4/3 in 2000ms. Action: kill."
        *   Log Entry: ActionType "antigrief_entityspam_detected", Details "AntiGrief EntitySpam: Player {PlayerName} suspected of Entity Spam. Entity: minecraft:pig. Count: 4/3 in 2000ms. Action: kill.".

### AG_ES_SE_002
*   **Test Case ID:** AG_ES_SE_002
*   **Description:** Verify Non-Admin rapid use of `minecraft:creeper_spawn_egg` (Creeper entity is NOT monitored) results in no action.
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: true`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 3`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:pig"]` (Creeper is not listed)
    *   `config.entitySpamAction: "kill"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player attempts to use `minecraft:creeper_spawn_egg` item for the 4th time within 2000ms.
*   **Expected Outcome:**
    *   Item use event is allowed. Creeper entity spawns.
    *   No anti-grief message to player.
    *   No anti-grief admin notification from entity spam check.
    *   No anti-grief log entry from entity spam check.
    *   No anti-grief flag from entity spam check.

### AG_ES_SE_003
*   **Test Case ID:** AG_ES_SE_003
*   **Description:** Verify Non-Admin rapid use of `minecraft:pig_spawn_egg` in Creative mode is allowed due to `entitySpamBypassInCreative: true`.
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: true`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 3`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:pig"]`
    *   `config.entitySpamAction: "kill"`
    *   Player is Non-Admin, in Creative mode.
*   **Action:** Player attempts to use `minecraft:pig_spawn_egg` item for the 4th time within 2000ms.
*   **Expected Outcome:**
    *   Item use event is allowed. Pig entity spawns.
    *   No anti-grief action.

### AG_ES_SE_004
*   **Test Case ID:** AG_ES_SE_004
*   **Description:** Verify Non-Admin rapid use of `minecraft:pig_spawn_egg` (Survival) is prevented when `entitySpamBypassInCreative: false`.
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: false`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 3`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:pig"]`
    *   `config.entitySpamAction: "kill"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player attempts to use `minecraft:pig_spawn_egg` item for the 4th time within 2000ms.
*   **Expected Outcome:**
    *   Event cancelled. Pig not spawned.
    *   Player receives message: "§c[AntiGrief] You are using spawn eggs too quickly!"
    *   Detection logged by `checkEntitySpam` via `actionManager`.

---

## Scenario 6: Spawn Egg Spam (`entitySpamAction: "warn"`)

### AG_ES_SE_005
*   **Test Case ID:** AG_ES_SE_005
*   **Description:** Verify Non-Admin rapid use of `minecraft:cow_spawn_egg` (monitored) results in a warning, but spawn is allowed.
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: true`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 3`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:cow"]`
    *   `config.entitySpamAction: "warn"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player attempts to use `minecraft:cow_spawn_egg` item for the 4th time within 2000ms.
*   **Expected Outcome:**
    *   Item use event is allowed. Cow entity spawns.
    *   Player receives message: "§e[AntiGrief] Warning: Using spawn eggs too quickly is monitored."
    *   Detection logged by `checkEntitySpam` via `actionManager`.

---

## Scenario 7: Spawn Egg Spam (`entitySpamAction: "logOnly"`)

### AG_ES_SE_006
*   **Test Case ID:** AG_ES_SE_006
*   **Description:** Verify Non-Admin rapid use of `minecraft:sheep_spawn_egg` (monitored) is allowed, no player message, only admin/log actions.
*   **Prerequisites/Setup:**
    *   `config.enableEntitySpamAntiGrief: true`
    *   `config.entitySpamBypassInCreative: true`
    *   `config.entitySpamTimeWindowMs: 2000`
    *   `config.entitySpamMaxSpawnsInWindow: 3`
    *   `config.entitySpamMonitoredEntityTypes: ["minecraft:sheep"]`
    *   `config.entitySpamAction: "logOnly"`
    *   Player is Non-Admin, in Survival mode.
*   **Action:** Player attempts to use `minecraft:sheep_spawn_egg` item for the 4th time within 2000ms.
*   **Expected Outcome:**
    *   Item use event is allowed. Sheep entity spawns.
    *   No direct player message from handler.
    *   Detection logged by `checkEntitySpam` via `actionManager`.

---
