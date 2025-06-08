# Anti-Grief Wither Control Feature - Conceptual Test Cases

## Test Case Structure:
1.  **Test Case ID:** Unique identifier.
2.  **Description:** What the test case is verifying.
3.  **Prerequisites/Setup:**
    *   Relevant `config.js` settings.
    *   Context (spawner identification is a known limitation).
4.  **Action:** Action performed.
5.  **Expected Outcome:**
    *   Wither killed/allowed.
    *   Admin notifications (conceptual).
    *   Log entry details (conceptual).
    *   Flags (conceptual, context "Unknown/Environment").

---

## Scenario 1: `witherSpawnAction: "kill"`

### AG_WTR_001
*   **Test Case ID:** AG_WTR_001
*   **Description:** Verify Wither is killed when `witherSpawnAction` is "kill" and feature is enabled. `allowAdminWitherSpawn` is true, but spawner context is "Unknown/Environment".
*   **Prerequisites/Setup:**
    *   `config.enableWitherAntiGrief: true`
    *   `config.allowAdminWitherSpawn: true`
    *   `config.witherSpawnAction: "kill"`
*   **Action:** A `minecraft:wither` entity spawns in the world.
*   **Expected Outcome:**
    *   Wither entity is killed (`entity.kill()`).
    *   Admins notified (via `actionManager`): "§cAC [AntiGrief]: A Wither spawn event occurred. Context: Unknown/Environment. Action: kill (executed)."
    *   Log entry created (via `actionManager`): ActionType "antigrief_wither_spawn", Details "AntiGrief Wither: A Wither (ID: {entityId}) was spawned and killed by AntiGrief at {x.y.z}." (or similar reflecting actual log).
    *   General flag added (context "Unknown/Environment", via `actionManager`): type "antigrief_wither", reason "Player involved in unauthorized Wither spawn or Wither killed by AntiGrief.".

### AG_WTR_002
*   **Test Case ID:** AG_WTR_002
*   **Description:** Verify Wither is killed when `witherSpawnAction` is "kill", feature is enabled, and `allowAdminWitherSpawn` is false.
*   **Prerequisites/Setup:**
    *   `config.enableWitherAntiGrief: true`
    *   `config.allowAdminWitherSpawn: false`
    *   `config.witherSpawnAction: "kill"`
*   **Action:** A `minecraft:wither` entity spawns in the world.
*   **Expected Outcome:**
    *   Wither entity is killed (`entity.kill()`).
    *   Admins notified (via `actionManager`): "§cAC [AntiGrief]: A Wither spawn event occurred. Context: Unknown/Environment. Action: kill (executed)."
    *   Log entry created (via `actionManager`): ActionType "antigrief_wither_spawn", Details "AntiGrief Wither: A Wither (ID: {entityId}) was spawned and killed by AntiGrief at {x.y.z}."
    *   General flag added (context "Unknown/Environment", via `actionManager`): type "antigrief_wither", reason "Player involved in unauthorized Wither spawn or Wither killed by AntiGrief.".

---

## Scenario 2: `witherSpawnAction: "prevent"` (Implemented as "kill")

### AG_WTR_003
*   **Test Case ID:** AG_WTR_003
*   **Description:** Verify Wither is killed when `witherSpawnAction` is "prevent" (as it's executed as "kill") and feature is enabled.
*   **Prerequisites/Setup:**
    *   `config.enableWitherAntiGrief: true`
    *   `config.allowAdminWitherSpawn: true` (Spawner context is "Unknown/Environment")
    *   `config.witherSpawnAction: "prevent"`
*   **Action:** A `minecraft:wither` entity spawns in the world.
*   **Expected Outcome:**
    *   Wither entity is killed (`entity.kill()`).
    *   Admins notified (via `actionManager`): "§cAC [AntiGrief]: A Wither spawn event occurred. Context: Unknown/Environment. Action: prevent (executed as kill)."
    *   Log entry created (via `actionManager`): ActionType "antigrief_wither_spawn", Details "AntiGrief Wither: A Wither (ID: {entityId}) was spawned. 'prevent' action attempted (executed as 'kill' due to event timing)." (or similar reflecting actual log).
    *   General flag added (context "Unknown/Environment", via `actionManager`): type "antigrief_wither", reason "Player involved in unauthorized Wither spawn or Wither killed by AntiGrief.".

---

## Scenario 3: `witherSpawnAction: "logOnly"`

### AG_WTR_004
*   **Test Case ID:** AG_WTR_004
*   **Description:** Verify Wither is allowed to exist but its spawn is logged/notified when `witherSpawnAction` is "logOnly" and feature is enabled.
*   **Prerequisites/Setup:**
    *   `config.enableWitherAntiGrief: true`
    *   `config.allowAdminWitherSpawn: true` (Spawner context is "Unknown/Environment")
    *   `config.witherSpawnAction: "logOnly"`
*   **Action:** A `minecraft:wither` entity spawns in the world.
*   **Expected Outcome:**
    *   Wither entity is allowed to exist (`entity.kill()` is not called).
    *   Admins notified (via `actionManager`): "§cAC [AntiGrief]: A Wither spawn event occurred. Context: Unknown/Environment. Action: logOnly."
    *   Log entry created (via `actionManager`): ActionType "antigrief_wither_spawn", Details "AntiGrief Wither: A Wither (ID: {entityId}) was spawned. Action: logOnly." (or similar reflecting actual log).
    *   General flag added (context "Unknown/Environment", via `actionManager`): type "antigrief_wither", reason "Player involved in unauthorized Wither spawn or Wither killed by AntiGrief.".

---

## Scenario 4: Feature Disabled

### AG_WTR_005
*   **Test Case ID:** AG_WTR_005
*   **Description:** Verify Wither is allowed to exist without any anti-grief action when `enableWitherAntiGrief` is false.
*   **Prerequisites/Setup:**
    *   `config.enableWitherAntiGrief: false`
    *   `config.allowAdminWitherSpawn: true` (should not matter)
    *   `config.witherSpawnAction: "kill"` (should not matter)
*   **Action:** A `minecraft:wither` entity spawns in the world.
*   **Expected Outcome:**
    *   Wither entity is allowed to exist.
    *   No admin notification specific to anti-grief.
    *   No anti-grief log entry created.
    *   No anti-grief flag added.

---
