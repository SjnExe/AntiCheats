# Killaura & Aimbot Detection Investigation

This document outlines the investigation into detecting Killaura and Aimbot cheats using the `@minecraft/server` API.

## 1. Internal Documentation Review

*   Reviewed `Dev/README.md`. It provided links to community anti-cheat projects:
    *   Scythe Anticheat: [https://github.com/Scythe-Anticheat/Scythe-Anticheat](https://github.com/Scythe-Anticheat/Scythe-Anticheat)
    *   SafeGuard Anticheat: [https://github.com/BlaizerBrumo/SafeGuard](https://github.com/BlaizerBrumo/SafeGuard)
*   These projects offered initial ideas for checks (see below). No other specific internal notes on Killaura/Aimbot were found.

## 2. Research on Detection Techniques

Insights from community projects (Scythe, SafeGuard) and general anti-cheat principles:

*   **State Conflicts:** Attacking while in a state that should prevent it (e.g., using an item, sleeping, viewing inventory).
*   **"No Swing" Attacks:** Damage dealt without a corresponding client-side swing action (hard to detect reliably with current Script API, as direct swing events are not available).
*   **Multi-Aura / Multi-Target:** Attacking multiple distinct entities very rapidly.
*   **Invalid Head Rotations/View Snapping:** Player's view (pitch/yaw) changing impossibly fast or to invalid values.
*   **Hit Consistency/Rate:** Unnaturally consistent timing between hits or extremely high CPS (CPS is already implemented).
*   **Targeting Anomalies:** Unnaturally fast target switching, hitting through walls (difficult to confirm perfectly), attacking outside normal FOV.
*   **Aim Mechanics:** Robotic/perfect tracking, lack of natural aiming imperfections (very hard to distinguish from legitimate skill without advanced analysis).

## 3. API Capability Analysis for Detection

The `@minecraft/server` API provides several useful data points:

*   **Player View/Rotation:** `player.getViewDirection(): Vector3` and `player.getRotation(): Vector2` are available and crucial for aim analysis.
*   **Attack/Hit Events:** `world.afterEvents.entityHurt` (with `damagingEntity`) provides reliable hit confirmation.
*   **Player States:**
    *   `player.isSleeping`: Directly available.
    *   "Using Item": Can be inferred by tracking `ItemUse*` events (moderately complex).
    *   "Viewing Inventory/Chest": Difficult to determine reliably.
*   **Target Information:** `player.target` (pre-release, utility uncertain for player targeting) and `world.getEntitiesFromViewDirection(player)` can provide some info.
*   **Movement Data:** Location and velocity are available.

**Feasibility Summary:**
*   **High Feasibility:** Hit cadence, multi-target analysis, invalid rotation checks, view "snaps", checking for attacks while sleeping.
*   **Medium Feasibility:** Detecting attacks while "using an item" (custom state needed), analyzing view "locking" if `player.target` is useful or via consistent `getEntitiesFromViewDirection` results.
*   **Low Feasibility / High FP Risk:** Reliably detecting "no swing" attacks, true through-wall targeting (knowing client visibility), distinguishing advanced aimbot smoothness from skill.

## 4. Outlined Potential Detection Logic

Based on feasibility, the following checks were outlined as starting points:

### a. Invalid Rotation / View Snap (Aimbot Component)
*   **Concept:** Detects out-of-bounds pitch/yaw or excessively fast view changes during/after attacks.
*   **Data:** `lastPitch`, `lastYaw`, `lastAttackTick`.
*   **Logic:**
    1.  Check current pitch/yaw against absolute limits (e.g., pitch > 90).
    2.  If player attacked recently, calculate `deltaPitch` and `deltaYaw` from previous tick.
    3.  Flag if deltas exceed configured snap thresholds (e.g., 60 degrees for pitch, 90 for yaw in one tick).

### b. Multi-Target / Fast Target Switching (Killaura Component)
*   **Concept:** Detects hitting multiple distinct entities too quickly.
*   **Data:** `recentHits = [{ entityId, timestamp }]` (a short history of recent hits by the player).
*   **Logic (on player deals damage via `entityHurt`):**
    1.  Add current hit (target entity ID, timestamp) to `recentHits`.
    2.  Prune `recentHits` to a defined time window/size.
    3.  Count distinct entity IDs in the pruned `recentHits`.
    4.  Flag if distinct count exceeds a threshold (e.g., 3 entities) within a short time (e.g., 1 second).

### c. Attacking During Invalid States (Killaura Component)
*   **Concept:** Detects attacks while player should be unable to (e.g., sleeping).
*   **Data:** Player states like `player.isSleeping`; custom `pData.isUsingItem` if implemented.
*   **Logic (on player deals damage):**
    1.  If `player.isSleeping` is true, flag.
    2.  If `pData.isUsingItem` (and it's an attack-incompatible item use), flag.

## 5. Conclusion & Recommendations

*   The Script API offers viable tools for several Killaura/Aimbot detection heuristics.
*   Initial focus should be on:
    *   **View Snap / Invalid Rotation:** Relatively straightforward to implement.
    *   **Multi-Target Killaura:** Detects a common Killaura behavior.
    *   **State Conflict (Attacking while Sleeping):** Simple and reliable.
*   More advanced behavioral analysis of aiming patterns (smoothness, perfect tracking) is significantly more complex and has a higher risk of false positives with the current API capabilities.
*   "No Swing" and reliable "Attacking while in Inventory" are difficult to implement robustly.
*   All checks will require careful threshold tuning and testing.

This investigation provides a basis for selecting and implementing specific Killaura/Aimbot detection modules.
