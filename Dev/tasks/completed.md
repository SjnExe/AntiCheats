## Comprehensive Coding Style Review
- **Objective:** Review all project script files (especially those not recently modified) for adherence to `Dev/CodingStyle.md` naming conventions (camelCase for variables, constants, functions; PascalCase for classes) and other style guidelines.
- **Process & Status:**
  - (Completed) Identified files needing review.
  - (Completed) Performed style review and applied changes (naming conventions, JSDocs placeholders, filled JSDocs for key files like eventHandlers.js, playerDataManager.js, reportManager.js, and uiManager.js).
  - (Completed) Documented changes implicitly via code updates.
(Completed)

---
## Refactor: Standardize Check Actions & Configurable Punishments
- **Objective:** Create a unified system for how cheat detections trigger actions (flag, log, notify, command execution) and make these actions configurable per check type in `config.js`.
- **Process & Status:**
  - (Completed) Designed `actionManager.js` and `checkActionProfiles` structure in `config.js`.
  - (Completed) Implemented `actionManager.js` to handle flag, log, and notify actions.
  - (Completed) Added `checkActionProfiles` to `config.js` and populated it for refactored checks.
  - (Completed) Integrated `actionManager.executeCheckAction` into `main.js` and `eventHandlers.js` for availability to check scripts.
  - (Completed) Refactored major checks: Fly, Speed, Reach, NoFall, Nuker.
  - (Completed) Refactored combat checks: CPS, ViewSnap (pitch/yaw/invalid), MultiTarget Aura, AttackWhileSleeping.
  - (Completed) Refactored world check: IllegalItemUse/Place.
  - **(Completed):**
    - Performed a final review sweep of all files within `AntiCheatsBP/scripts/checks/` to find any remaining minor check logic or sub-detections that still use direct calls to `addFlag`, `notifyAdmins`, etc. Refactor these if found.
    - Ensured all `checkType` strings used in every refactored check precisely match a defined profile key in `config.js`.
    - Verified overall consistency of the new system.
  - **(Future / Deferred):** Design and implement advanced action configurations (e.g., conditional command execution directly from `actionManager`).
(Completed as of Current Session)

---
# Completed Tasks


*   **Movement - Advanced:** SjnExe parity goal.
    *   **Invalid Y Velocity / High Velocity:** Monitor `player.getVelocity().y`. Flag if vertical velocity exceeds thresholds not achievable through normal means (e.g., super-jump without effects, excessive upward dash). (SafeGuard, SjnExe 'High Velocity')
        *Implemented by:
            - Adding `pData` fields: `lastJumpBoostLevel`, `lastSlowFallingTicks`, `lastLevitationTicks`, `lastTookDamageTick`, `lastUsedElytraTick`. (Note: `lastUsedRiptideTick`, `lastOnSlimeBlockTick` were part of initial planning but deferred).
            - Adding `config.js` settings: `enableHighYVelocityCheck`, `maxYVelocityPositive`, `jumpBoostYVelocityBonus`, `yVelocityGraceTicks`. (These were pre-existing from `types.js` and previous config setup but are utilized by this check).
            - Adding `checkActionProfiles` entry for `"movement_high_y_velocity"` (This was pre-existing as part of `types.js` and config setup but is now actively used).
            - Updating `pData` fields for effects (Jump Boost, Slow Falling, Levitation) and elytra usage (`lastUsedElytraTick`) within `AntiCheatsBP/scripts/checks/movement/flyCheck.js`.
            - Updating `pData.lastTookDamageTick` in `AntiCheatsBP/scripts/core/eventHandlers.js` (`handleEntityHurt`).
            - Integrating the core high Y-velocity detection logic into `flyCheck.js`. This logic considers grace conditions (damage, elytra, climbing, slow falling) and adjusts maximum allowed Y velocity based on Jump Boost.
            - Deferred Riptide and Slime block grace conditions for future enhancement.*
*   **Implement Killaura/Aimbot detection** (based on investigation in `Dev/Killaura_Aimbot_Investigation.md`). SjnExe parity goal.
    *   **View Snap / Invalid Rotation:** Detect changes in pitch/yaw exceeding thresholds (e.g., pitch > 60°/tick, yaw > 90°/tick) during or immediately after combat. Check for absolute invalid rotations (e.g., pitch > 90° or < -90°). *(Verified existing implementation in `viewSnapCheck.js` and configuration in `config.js`. No code changes required.)*
*   **Implement Killaura/Aimbot detection** (based on investigation in `Dev/Killaura_Aimbot_Investigation.md`). SjnExe parity goal.
    *   **Multi-Target Killaura:** Track recently attacked entities. Flag if >N (e.g., 3) distinct entities are attacked within a very short window (e.g., 1-2 seconds). *(Verified existing implementation in `multiTargetCheck.js` and configuration in `config.js`. No code changes required.)*
*   **Implement Killaura/Aimbot detection** (based on investigation in `Dev/Killaura_Aimbot_Investigation.md`). SjnExe parity goal.
    *   **State Conflicts:**
        *   *Attacking while using an item:* Flag if an attack occurs while the player is in a state considered "using an item" (e.g., eating food, drawing a bow, using a shield) that should prevent attacks. Requires custom state tracking. (Scythe, SjnExe)
            *Implemented by:
                - Adding `isUsingConsumable`, `isChargingBow`, `isUsingShield`, `lastItemUseTick` to `PlayerAntiCheatData` in `types.js` and `playerDataManager.js` (including initialization and session reset).
                - Defining `attackBlockingConsumables`, `attackBlockingBows`, `attackBlockingShields`, and `itemUseStateClearTicks` in `config.js` and adding them to `editableConfigValues`.
                - Updating `handleItemUse` in `eventHandlers.js` to set these player states and `lastItemUseTick` based on item usage and the new config arrays.
                - Adding `checkAttackWhileUsingItem` to `stateConflictCheck.js` to detect attacks during these states, and ensuring it's exported via the wildcard in `checks/index.js`.
                - Integrating the `checkAttackWhileUsingItem` call into `handleEntityHurt` in `eventHandlers.js`.
                - Adding new `checkActionProfiles` ("combat_attack_while_consuming", "combat_attack_while_bow_charging", "combat_attack_while_shielding") to `config.js`.
                - Implementing logic in the main tick loop in `main.js` to auto-clear these states based on `itemUseStateClearTicks`.*
*   **Implement Killaura/Aimbot detection** (based on investigation in `Dev/Killaura_Aimbot_Investigation.md`). SjnExe parity goal.
    *   **State Conflicts:**
        *   *Attacking while sleeping:* Flag if an attack occurs while `player.isSleeping` is true. (Scythe, SjnExe) *(Verified existing implementation in `stateConflictCheck.js`, `eventHandlers.js`, and `config.js`. No code changes required.)*
*   **Implement Killaura/Aimbot detection** (based on investigation in `Dev/Killaura_Aimbot_Investigation.md`). SjnExe parity goal.
    *   **State Conflicts:**
        *   *Attacking while chest open:* (Low feasibility with current API) Investigate if any event or state reliably indicates an open container UI. (Scythe)
            *Investigation Complete: Reviewed `@minecraft/server` API documentation (v2.1.0-beta as of 2025-05-07). No direct or reliable event/player property was found to determine if a player has a chest UI (or general container UI) open for the purpose of preventing an attack. Feasibility remains low with the current API. Relevant classes like `ScreenDisplay`, `PlayerCursorInventoryComponent`, `BlockInventoryComponent`, and events like `PlayerInteractWithBlockAfterEvent` were considered but do not offer a robust solution for this specific state detection in a preventative context.*
*   **Implement Killaura/Aimbot detection** (based on investigation in `Dev/Killaura_Aimbot_Investigation.md`). SjnExe parity goal.
    *   *"No Swing" detection:* (Needs further API feasibility check) Investigate if server-side damage events can be correlated with client-side swing animations/packets, though direct detection is likely difficult. (Scythe)
        *Investigation Complete: Reviewed `@minecraft/server` API documentation (v2.1.0-beta as of 2025-05-07). No direct server-side API was found to detect client-side swing animations independently of the resulting damage or interaction events. Correlating damage events with an *expected* but unconfirmed swing animation is unreliable for cheat detection with the current API. Feasibility remains low/very difficult.*
*   **Scaffold/Tower Detection:** SjnExe parity goal.
    *   **Tower-like Upward Building:** Detect rapid, continuous upward pillar building significantly faster than manual placement, especially if combined with unusual look angles.
        *Implemented by:
            - Adding `recentBlockPlacements`, `lastPillarBaseY`, `consecutivePillarBlocks`, `lastPillarTick`, `currentPillarX`, `currentPillarZ` to `PlayerAntiCheatData` (`types.js`, `playerDataManager.js`).
            - Adding configurations: `enableTowerCheck`, `towerMaxTickGap`, `towerMinHeight`, `towerMaxPitchWhilePillaring`, `towerPlacementHistoryLength` and a `checkActionProfiles` entry for "world_tower_build" (`config.js`).
            - Creating `checkTower` function in `AntiCheatsBP/scripts/checks/world/towerCheck.js` to track pillar formation and check for height and player pitch.
            - Exporting `checkTower` via `checks/index.js`.
            - Creating `handlePlayerPlaceBlockAfter` in `eventHandlers.js` and subscribing to `world.afterEvents.playerPlaceBlock` in `main.js` to call `checkTower`.*
*   **Scaffold/Tower Detection:** SjnExe parity goal.
    *   **Flat/Invalid Rotation While Building:** Detect if player is placing blocks (especially in complex patterns like scaffolding) while maintaining an unnaturally static or limited range of head rotation (e.g., always looking straight down or perfectly horizontal).
        *Implemented by:
            - Adding configurations to `config.js` for enabling the check (`enableFlatRotationCheck`), consecutive blocks to analyze (`flatRotationConsecutiveBlocks`), variance thresholds for pitch/yaw (`flatRotationMaxPitchVariance`, `flatRotationMaxYawVariance`), and specific pitch ranges for flat horizontal/downward building (`flatRotationPitchHorizontalMin/Max`, `flatRotationPitchDownwardMin/Max`). Added these to `editableConfigValues`.
            - Adding a `checkActionProfiles` entry for `"world_flat_rotation_building"` in `config.js`.
            - Creating `checkFlatRotationBuilding` function in `AntiCheatsBP/scripts/checks/world/towerCheck.js` that analyzes `pData.recentBlockPlacements` (populated by `checkTower` during block placement) for static pitch/yaw or pitch within defined flat ranges.
            - Exporting the `checkFlatRotationBuilding` function via `checks/index.js`.
            - Integrating the call to `checkFlatRotationBuilding` into `handlePlayerPlaceBlockAfter` in `eventHandlers.js`, called after `checkTower`.*
*   **Scaffold/Tower Detection:** SjnExe parity goal.
    *   **Placing Blocks Under Self While Looking Up:** Detect if player is placing blocks beneath their feet to pillar upwards while their pitch indicates they are looking upwards (away from the placement area).
        *(Verified: This scenario is already covered by the `checkTower` function in `towerCheck.js`. The existing pitch check (`pitch > config.towerMaxPitchWhilePillaring`) correctly flags players looking too far upwards while pillaring.)*
*   **Scaffold/Tower Detection:** SjnExe parity goal.
    *   **Downward Scaffold:** Detect rapid placement of blocks downwards while airborne, especially if player maintains horizontal speed.
        *Implemented by:
            - Adding `consecutiveDownwardBlocks`, `lastDownwardScaffoldTick`, `lastDownwardScaffoldBlockLocation` to `PlayerAntiCheatData` (`types.js`, `playerDataManager.js`).
            - Adding configurations to `config.js` for enabling the check (`enableDownwardScaffoldCheck`), min blocks (`downwardScaffoldMinBlocks`), max tick gap (`downwardScaffoldMaxTickGap`), and min horizontal speed (`downwardScaffoldMinHorizontalSpeed`). Added these to `editableConfigValues`.
            - Adding a `checkActionProfiles` entry for `"world_downward_scaffold"` in `config.js`.
            - Creating `checkDownwardScaffold` function in `AntiCheatsBP/scripts/checks/world/towerCheck.js` to track downward block placements while airborne and check against speed/count thresholds.
            - Exporting the `checkDownwardScaffold` function via `checks/index.js`.
            - Integrating the call to `checkDownwardScaffold` into `handlePlayerPlaceBlockAfter` in `eventHandlers.js`.*
*   **Scaffold/Tower Detection:** SjnExe parity goal.
    *   **Placing Blocks onto Air/Liquid:** Detect block placements where the targeted block face is air or a liquid, without valid support, indicative of scaffold-like behavior.
        *Implemented by:
            - Adding configurations `enableAirPlaceCheck` and `airPlaceSolidBlocks` list to `config.js`, and including them in `editableConfigValues`.
            - Adding a `checkActionProfiles` entry for `"world_air_place"` in `config.js`.
            - Creating `checkAirPlace` function in `AntiCheatsBP/scripts/checks/world/towerCheck.js`. This function checks if a block from `airPlaceSolidBlocks` is placed against air/liquid and if it lacks solid adjacent support (excluding the target face itself if it's air/liquid).
            - Exporting the `checkAirPlace` function via `checks/index.js`.
            - Creating `handlePlayerPlaceBlockBefore` in `eventHandlers.js`.
            - Subscribing to `world.beforeEvents.playerPlaceBlock` in `main.js` to call `handlePlayerPlaceBlockBefore`, which in turn calls `checkAirPlace`.*
*   **Timer/FastUse/FastPlace:** SjnExe parity goal.
    *   **Timer (Game Speed):** Investigate methods to detect if overall game tick or player action processing speed is unnaturally altered. This is complex and may have limited server-side detectability. (Original todo)
        *Investigation Complete: Direct detection of client-side game speed (Timer hack) is not feasible with the server-side Script API. The server processes actions based on its own tick rate. However, Timer abuse would manifest as an abnormally high rate of player actions (e.g., attacks, block placements, item uses) received and processed by the server in a short real-time period or within too few server ticks. This can be indirectly addressed by robust "FastUse," "FastPlace," and general "Action Rate" checks (like CPS). No separate "Timer (Game Speed)" check will be implemented; its effects will be caught by these more specific action rate detections.*
*   **Timer/FastUse/FastPlace:** SjnExe parity goal.
    *   **FastUse/FastPlace:** Monitor the time between consecutive uses of items (e.g., firing bows/crossbows, throwing pearls/snowballs, eating food) or placement of blocks. Flag if these actions occur faster than humanly possible or vanilla game limits allow. (Scythe, SjnExe)
        *Implemented by:
            - **Fast Item Use:**
                - Added `itemUseTimestamps: Record<string, number>` to `PlayerAntiCheatData` (`types.js`, `playerDataManager.js`).
                - Added `enableFastUseCheck` and `fastUseItemCooldowns: Object.<string, number>` to `config.js` (and to `editableConfigValues`).
                - Created `checkFastUse` function in `AntiCheatsBP/scripts/checks/world/fastUseCheck.js` (exported via `checks/index.js`).
                - Integrated `checkFastUse` into `handleItemUse` in `eventHandlers.js` (which now includes `logManager` and is `async`).
                - Added `"action_fast_use"` profile to `checkActionProfiles` in `config.js`.
            - **Fast Block Placement:**
                - Added `recentPlaceTimestamps: number[]` to `PlayerAntiCheatData` (`types.js`, `playerDataManager.js`).
                - Added `enableFastPlaceCheck`, `fastPlaceTimeWindowMs`, `fastPlaceMaxBlocksInWindow` to `config.js` (and to `editableConfigValues`).
                - Created `checkFastPlace` function in `AntiCheatsBP/scripts/checks/world/buildingChecks.js` (exported via `checks/index.js`).
                - Integrated `checkFastPlace` into `handlePlayerPlaceBlockAfter` in `eventHandlers.js`.
                - Added `"world_fast_place"` profile to `checkActionProfiles` in `config.js`.*

---


*   **Movement - Advanced:** SjnExe parity goal.
    *   **NoSlow:** Detect if player maintains normal walking/sprinting speed while performing actions that should slow them down (e.g., using a bow, eating, sneaking over certain blocks if applicable). Requires tracking player speed against their current action state. (Scythe, SjnExe)
        *Implemented by:
            - Adding configurations to `config.js` for enabling the check (`enableNoSlowCheck`) and max speed thresholds for actions like eating (`noSlowMaxSpeedEating`), charging bow (`noSlowMaxSpeedChargingBow`), using shield (`noSlowMaxSpeedUsingShield`), and sneaking (`noSlowMaxSpeedSneaking`).
            - Adding these new configurations to `editableConfigValues` in `config.js`.
            - Adding a `checkActionProfiles` entry for `"movement_noslow"` in `config.js`.
            - Creating the `checkNoSlow` function in `AntiCheatsBP/scripts/checks/movement/noSlowCheck.js`. This function:
                - Calculates current horizontal speed.
                - Checks `pData` states (`isUsingConsumable`, `isChargingBow`, `isUsingShield`) and `player.isSneaking` to identify the current action.
                - Compares speed against the action-specific threshold from `config.js`.
                - Includes a basic tolerance if the player has a Speed effect.
                - Calls `executeCheckAction` if speed exceeds the threshold.
            - Exporting `checkNoSlow` from `AntiCheatsBP/scripts/checks/index.js`.
            - Integrating the call to `checkNoSlow` (with `await`) into the main tick loop in `AntiCheatsBP/scripts/main.js` for each player, ensuring other async checks in the loop are also `await`ed for consistency.*

---


*   **Movement - Advanced:** SjnExe parity goal.
    *   **InvalidSprint:** Detect sprinting under conditions where it should be impossible (e.g., while movement is impaired by blindness, while actively sneaking, while riding an entity that doesn't permit player sprinting). (Scythe)
        *Implemented by:
            - Adding `lastBlindnessTicks` to `PlayerAntiCheatData` (`types.js`, `playerDataManager.js`) for session-only tracking of the blindness effect.
            - Adding `enableInvalidSprintCheck` to `config.js` and `editableConfigValues`.
            - Adding a `checkActionProfiles` entry for `"movement_invalid_sprint"` in `config.js`.
            - Creating `checkInvalidSprint` function in `AntiCheatsBP/scripts/checks/movement/invalidSprintCheck.js`. This function updates `pData.lastBlindnessTicks` based on player effects. It then checks if `player.isSprinting` while also being blind (`pData.lastBlindnessTicks > 0`), sneaking (`player.isSneaking`), or riding an entity (`player.isRiding`).
            - Exporting `checkInvalidSprint` from `AntiCheatsBP/scripts/checks/index.js`.
            - Integrating the call to `checkInvalidSprint` (with `await`) into the main tick loop in `AntiCheatsBP/scripts/main.js` for each player.
            - Ensured `currentTick` is passed to `checkFly` and `checkSpeed` in `main.js` for consistency during the previous subtask.*

---


*   **World Interaction - Advanced:** SjnExe parity goal.
    *   **AutoTool:** Monitor `player.selectedSlot` changes in conjunction with block break events. Detect if player's selected slot almost instantaneously switches to the optimal tool for breaking a block type just before the break occurs, and then potentially switches back. (Scythe)
        *Implemented by:
            - Adding `pData` fields to `types.js` and `playerDataManager.js`: `previousSelectedSlotIndex`, `lastSelectedSlotChangeTick`, `isAttemptingBlockBreak`, `breakingBlockTypeId`, `breakingBlockLocation`, `slotAtBreakAttemptStart`, `breakAttemptTick`, `switchedToOptimalToolForBreak`, `optimalToolSlotForLastBreak`, `lastBreakCompleteTick`, `blockBrokenWithOptimalTypeId`, `optimalToolTypeIdForLastBreak`.
            - Updating `playerDataManager.updateTransientPlayerData` to track `selectedSlotIndex` changes and update `lastSelectedSlotChangeTick` and `previousSelectedSlotIndex`.
            - Adding `config.js` settings: `enableAutoToolCheck`, `autoToolSwitchToOptimalWindowTicks`, `autoToolSwitchBackWindowTicks`.
            - Adding a `checkActionProfiles` entry for `"world_autotool"` in `config.js`.
            - Creating `utils/itemUtils.js` with (simplified placeholder) `getBlockBreakingSpeed` and `getOptimalToolForBlock` helper functions, and placeholder data for block/tool properties. This file also includes expanded block/tool data from a subsequent subtask. Exported these utilities via `utils/index.js`.
            - Modifying `eventHandlers.js`:
                - Renamed `handlePlayerBreakBlock` to `handlePlayerBreakBlockBeforeEvent` and updated its signature and logic to set `pData` fields like `isAttemptingBlockBreak`, `breakingBlockTypeId`, `breakingBlockLocation`, `slotAtBreakAttemptStart`, `breakAttemptTick`.
                - Updated `handlePlayerBreakBlockAfter` signature and logic to set `pData` fields like `lastBreakCompleteTick`, `blockBrokenWithOptimalTypeId`, and `optimalToolTypeIdForLastBreak` if a switch to an optimal tool was detected.
            - Updating `main.js` event subscriptions for `playerBreakBlock.before` and `playerBreakBlock.after` to use the modified handlers with all necessary parameters.
            - Creating `checkAutoTool` function in `AntiCheatsBP/scripts/checks/world/autoToolCheck.js`. This function performs tick-based detection of "switch-to-optimal" tool patterns around block breaks and "switch-back" patterns after a break, using the `pData` flags set by event handlers and the `itemUtils` helpers. It also includes logic for state cleanup.
            - Updating `violationDetails` in `checkAutoTool` to use the more specific `pData` fields for logging.
            - Exporting `checkAutoTool` via `checks/index.js`.
            - Integrating the call to `checkAutoTool` (with `await` and `player.dimension`) into the main tick loop in `main.js`.*

---


*   **World Interaction - Advanced:** SjnExe parity goal.
    *   **InstaBreak:** Detect breaking of blocks that are typically unbreakable (e.g., bedrock, barriers, command blocks by non-ops) or blocks broken significantly faster than possible even with enchantments/effects. (Scythe)
        *Implemented by:
            - **Unbreakable Block Detection:**
                - Added `pData` fields to `types.js` and `playerDataManager.js` for break timing and tool used: `breakStartTimeMs`, `breakStartTickGameTime`, `expectedBreakDurationTicks`, `toolUsedForBreakAttempt`.
                - Added `config.js` settings: `enableInstaBreakUnbreakableCheck`, `instaBreakUnbreakableBlocks` list.
                - Created `checkBreakUnbreakable` function in `AntiCheatsBP/scripts/checks/world/instaBreakCheck.js`. This function checks if the target block is in `instaBreakUnbreakableBlocks` and if the player is not in creative mode; if so, it cancels the `PlayerBreakBlockBeforeEvent` and flags the player.
                - Added `"world_instabreak_unbreakable"` `checkActionProfiles` entry in `config.js`.
                - Integrated the call to `checkBreakUnbreakable` into `handlePlayerBreakBlockBeforeEvent` in `eventHandlers.js`, ensuring it runs first and can cancel the event.
            - **Break Speed Detection:**
                - Added `config.js` settings: `enableInstaBreakSpeedCheck`, `instaBreakTimeToleranceTicks`.
                - Created `checkBreakSpeed` function (initially placeholder, then with core logic) in `instaBreakCheck.js`.
                - Added `"world_instabreak_speed"` `checkActionProfiles` entry in `config.js`.
                - Refined `getExpectedBreakTicks` in `AntiCheatsBP/scripts/utils/itemUtils.js` to provide a more (though still simplified) vanilla-like calculation of expected block break duration in ticks. This included renaming `getBlockBreakingSpeed` to `calculateRelativeBlockBreakingPower` and correcting the application of Efficiency and Mining Fatigue effects in `getExpectedBreakTicks`.
                - In `handlePlayerBreakBlockBeforeEvent` (in `eventHandlers.js`), added logic to calculate and store `pData.expectedBreakDurationTicks` (using the refined `getExpectedBreakTicks`) and `pData.toolUsedForBreakAttempt` when a block break starts.
                - Implemented the core logic in `checkBreakSpeed` to be called from `handlePlayerBreakBlockAfterEvent`. This logic compares the actual break duration (`currentTick - pData.breakStartTickGameTime`) with `pData.expectedBreakDurationTicks` and flags if the actual time is less than the expected time minus `config.instaBreakTimeToleranceTicks`.
                - Integrated the call to `checkBreakSpeed` into `handlePlayerBreakBlockAfterEvent` in `eventHandlers.js`.
            - Exported both `checkBreakUnbreakable` and `checkBreakSpeed` from `checks/index.js`.*

---


*   **Player Behavior - Advanced:** SjnExe parity goal.
    *   **Anti-Gamemode Creative (Anti-GMC):** If a player is unexpectedly in Creative mode (not an admin or by legitimate means), flag and potentially switch them back to Survival. Notify admins. (SafeGuard, SjnExe)
        *Implemented by:
            - Adding `config.js` settings: `enableAntiGMCCheck`, `antiGMCSwitchToGameMode`, `antiGMCAutoSwitch`.
            - Adding these new settings to `editableConfigValues` in `config.js`.
            - Adding a `checkActionProfiles` entry for `"player_antigmc"` in `config.js`.
            - Verifying that `types.js` and `playerDataManager.js` did not require immediate new fields for core detection.
            - Creating `checkAntiGMC` function in `AntiCheatsBP/scripts/checks/world/antiGMCCheck.js` (placed in `/world` for now, noted for potential refactor to `/player`). This function checks `player.gameMode`, uses `getPlayerPermissionLevel` (from `playerUtils.js` which uses `rankManager.js`'s `permissionLevels`) to determine if the player is exempt. If not exempt and in creative mode, it flags and optionally switches gamemode based on config.
            - Ensuring `getPlayerPermissionLevel` (from `playerUtils.js`) and `permissionLevels` (from `rankManager.js`) are correctly exported and used.
            - Exporting `checkAntiGMC` via `checks/index.js`.
            - Integrating the call to `checkAntiGMC` (with `await`) into the main tick loop in `main.js`.*
*   **Player Behavior - Advanced:** SjnExe parity goal.
    *   **Namespoof:** Check `player.nameTag` for excessive length, use of disallowed characters (e.g., non-ASCII, control characters beyond typical gameplay names), or rapid changes. (Scythe, SjnExe)
        *   *Note: Concern raised about potential false positives for console players (e.g., due to spaces, specific character sets, or typical console Gamertag lengths). Ensure implementation is flexible or provides configuration to handle this when developing this feature.*
        *Implemented by:
            - Adding `lastKnownNameTag` and `lastNameTagChangeTick` to `PlayerAntiCheatData` in `types.js` and `playerDataManager.js`.
            - Adding `config.js` settings: `enableNameSpoofCheck`, `nameSpoofMaxLength`, `nameSpoofDisallowedCharsRegex`, `nameSpoofMinChangeIntervalTicks`.
            - Adding these new settings to `editableConfigValues` in `config.js`.
            - Adding a `checkActionProfiles` entry for `"player_namespoof"` in `config.js`.
            - Creating `checkNameSpoof` function in `AntiCheatsBP/scripts/checks/world/nameSpoofCheck.js` (placed in `/world` for now). This function checks nameTag length, for disallowed characters using the regex, and for rapid changes against `config.nameSpoofMinChangeIntervalTicks`. It updates `pData.lastKnownNameTag` and `pData.lastNameTagChangeTick` on change.
            - Exporting `checkNameSpoof` via `checks/index.js`.
            - Integrating the call to `checkNameSpoof` (with `await`) into the main tick loop in `main.js`.*

---


*   **Player Behavior - Advanced:** SjnExe parity goal.
    *   **InventoryMods (Hotbar Switch):** Detect if items are moved or used from the hotbar in ways that are impossible manually, e.g., switching active slot and using an item in the same tick, or moving items in inventory while performing other actions that should lock inventory. (Scythe - may require careful API event correlation)
        *Implemented by:
            - Adding `enableInventoryModCheck` to `config.js` and `editableConfigValues`.
            - Adding a `checkActionProfiles` entry for "player_inventory_mod" in `config.js`.
            - Verifying existing `pData` fields (`lastSelectedSlotChangeTick`, `isUsingConsumable`, `isChargingBow`) were sufficient for initial checks.
            - Creating `AntiCheatsBP/scripts/checks/player/inventoryModCheck.js` with two functions:
                - `checkSwitchAndUseInSameTick`: Called from `handleItemUse` (which handles `ItemUseBeforeEvent`). Detects if `pData.lastSelectedSlotChangeTick` is the same as `currentTick` during item use.
                - `checkInventoryMoveWhileActionLocked`: Called from a new `handleInventoryItemChange` (for `PlayerInventoryItemChangeAfterEvent`). Detects item moves if `pData.isUsingConsumable` or `pData.isChargingBow` is true.
            - Exporting these functions via `checks/index.js` (from the new `checks/player/` directory).
            - Integrating `checkSwitchAndUseInSameTick` into `handleItemUse` in `eventHandlers.js` (ensuring `currentTick` is passed).
            - Creating `handleInventoryItemChange` in `eventHandlers.js` and subscribing to `world.afterEvents.playerInventoryItemChange` in `main.js` to call it, passing necessary dependencies including `currentTick`.*

## Refactoring: Standardized Actions for Combat & IllegalItem Checks
**Date:** Current Session

Continued the 'Standardize Check Actions' refactor. Migrated several combat checks (`cpsCheck.js`, `viewSnapCheck.js` for pitch/yaw/invalid, `multiTargetCheck.js`, `stateConflictCheck.js` for attack-while-sleeping) and the `illegalItemsCheck.js` (for use/place) to use the new `actionManager.executeCheckAction` system. Added corresponding action profiles for these new check types (e.g., 'combat_cps_high', 'combat_viewsnap_pitch', 'world_illegal_item_use') to `checkActionProfiles` in `config.js`.

---

## Features: Combat Log Detection
**Date:** Current Session

Implemented Combat Log Detection. The system tracks player PvP interactions using `lastCombatInteractionTime` in `playerData` (via `entityHurt` event). If a player leaves (`playerLeave` event) within `combatLogThresholdSeconds` (configurable) of their last combat, they are flagged for 'combat_log' (flag amount configurable via `combatLogFlagIncrement`), admins are notified (using `combatLogMessage`), and the event is logged (using `combatLogReason`). This feature is disabled by default (`enableCombatLogDetection = false` in `config.js`). Logic primarily handled in `eventHandlers.js`, with data managed by `playerDataManager.js` and configurations in `config.js`. `README.md` updated.

---

## Implemented Owner and Rank System
*(Date is a placeholder based on current interaction)*

Added a visual rank system (Owner, Admin, Member) that affects chat and nametags.

*   **Configuration:**
    *   `ownerPlayerName` added to `AntiCheatsBP/scripts/config.js` to define the server owner by exact name.
    *   Admins are still determined by `adminTag` in `config.js`.
*   **Core Logic:**
    *   `isOwner(playerName)` function added to `AntiCheatsBP/scripts/utils/playerUtils.js` to check against `ownerPlayerName`.
    *   New file `AntiCheatsBP/scripts/core/rankManager.js` created:
        *   Defines `OWNER_RANK`, `ADMIN_RANK`, `MEMBER_RANK` constants with `chatPrefix` and `nametagPrefix` properties (including color codes).
        *   `getPlayerRankDisplay(player)`: Determines a player's rank (Owner > Admin > Member).
        *   `updatePlayerNametag(player)`: Sets the player's `nameTag` property using the rank's `nametagPrefix` and the player's actual name (`player.name`).
*   **Integration:**
    *   **Chat:** In `AntiCheatsBP/scripts/core/eventHandlers.js`, `handleBeforeChatSend` now uses `getPlayerRankDisplay` to prepend the colored rank prefix and player name to chat messages (e.g., `§c[Owner] §fPlayerName§f: message`).
    *   **Nametags:**
        *   A new `handlePlayerSpawn` function was added to `AntiCheatsBP/scripts/core/eventHandlers.js`.
        *   This handler calls `updatePlayerNametag` when a player spawns.
        *   The `mc.world.afterEvents.playerSpawn` event is now subscribed in `AntiCheatsBP/scripts/main.js` to trigger `handlePlayerSpawn`.
        *   Nametags are formatted like: `§cOwner§f\nPlayerActualName`.
*   **Visual Output:**
    *   Chat messages are prefixed with colored rank indicators.
    *   Player nametags display their rank in color above their actual name.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## High Priority / Next Up
*(Date is a placeholder based on current interaction)*
*   **Implement X-Ray Detection - Phase 1 (Ore Mining Notifications):** Added a system to notify admins when specified valuable ores are mined.
    - New configurations in `config.js`: `XRAY_DETECTION_NOTIFY_ON_ORE_MINE_ENABLED`, `XRAY_DETECTION_MONITORED_ORES`, `XRAY_DETECTION_ADMIN_NOTIFY_BY_DEFAULT`.
    - Implemented `handlePlayerBreakBlockAfter` in `eventHandlers.js` to check broken blocks against monitored ores and notify qualifying admins.
    - Admin notification preferences are managed via tags (`xray_notify_on`, `xray_notify_off`), controlled by the new `!ac xraynotify <on|off|status>` command in `commandManager.js`.
    - Registered the new event handler in `main.js`.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Standardize Naming Convention in `config.js` (Submitted)
*(Date is a placeholder based on current interaction)*

- **Chosen Convention:** `camelCase` for all exported variables from `AntiCheatsBP/scripts/config.js` (e.g., `exampleConfigVariable`, `maxAllowedSpeed`).
- **Documentation:** This convention was documented in `Dev/CodingStyle.md`, which specifies `camelCase` for configuration variables.
- **Refactoring `config.js`:** All `UPPER_SNAKE_CASE` variables in `AntiCheatsBP/scripts/config.js` were successfully renamed to their `camelCase` equivalents.
- **Updating Dependent Scripts:** All script files that import and use these configuration variables were updated to use the new `camelCase` names. This included:
    - `AntiCheatsBP/scripts/utils/playerUtils.js`
    - `AntiCheatsBP/scripts/core/commandManager.js`
    - `AntiCheatsBP/scripts/core/eventHandlers.js`
    - All individual check files within `AntiCheatsBP/scripts/checks/` (combat, movement, world subdirectories).
    - `AntiCheatsBP/scripts/main.js`.
- **Purpose:** To improve code consistency, readability, and maintainability as per user feedback and established coding style.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Created and Named Coding Style Guide (Submitted)
*(Date is a placeholder based on current interaction)*

Created a new documentation file, now named `Dev/CodingStyle.md`, to outline coding style conventions for the project. This includes naming conventions for variables (camelCase for config exports, general variables, functions; PascalCase for classes), JSDoc usage, and general formatting. The file was initially named `Dev/CODING_STYLE.md` and subsequently renamed to `Dev/CodingStyle.md`.

*   **Key Contents of `Dev/CodingStyle.md`:**
    *   Naming conventions for config variables, general variables, functions, classes, and constants.
    *   Guidelines for JSDoc comments and typedefs.
    *   Emphasis on following existing code formatting for consistency.
*   This document serves as a reference for maintaining code readability and uniformity across the project.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Implemented Initial Killaura/Aimbot Checks (v1) (Submitted)
*(Date is a placeholder based on current interaction)*

Implemented the first set of Killaura/Aimbot related detection modules based on prior investigation. These checks provide foundational capabilities for identifying suspicious combat behaviors.

*   **Key Implemented Checks:**
    *   **Invalid Pitch Detection (`checks/combat/viewSnapCheck.js`):**
        *   Flags players whose head pitch exceeds valid Minecraft limits (e.g., looking too far up or down).
        *   Uses `config.INVALID_PITCH_THRESHOLD_MIN` and `config.INVALID_PITCH_THRESHOLD_MAX`.
    *   **View Snap Detection (`checks/combat/viewSnapCheck.js`):**
        *   Flags players whose view rotation (pitch or yaw) changes at an impossibly fast rate within a short window (`config.VIEW_SNAP_WINDOW_TICKS`) after they deal damage (`pData.lastAttackTick`).
        *   Uses `config.MAX_PITCH_SNAP_PER_TICK` and `config.MAX_YAW_SNAP_PER_TICK`.
        *   Handles yaw wrapping for accurate delta calculation.
    *   **Multi-Target Killaura (`checks/combat/multiTargetCheck.js`):**
        *   Tracks recent entities hit by a player within a time window (`config.MULTI_TARGET_WINDOW_MS`).
        *   Flags if a player hits more than a configured number (`config.MULTI_TARGET_THRESHOLD`) of distinct entities.
        *   Maintains a limited history of hits (`config.MULTI_TARGET_MAX_HISTORY`).
    *   **Attack While Sleeping (`checks/combat/stateConflictCheck.js`):**
        *   Flags players if they deal damage while `player.isSleeping` is true.
        *   Uses `config.ENABLE_STATE_CONFLICT_CHECK` as its main toggle.
*   **Configuration:**
    *   Added new configuration variables to `AntiCheatsBP/scripts/config.js` for all thresholds, enabling/disabling these specific checks, and flag reasons (e.g., `ENABLE_VIEW_SNAP_CHECK`, `MAX_PITCH_SNAP_PER_TICK`, `FLAG_REASON_MULTI_AURA`).
*   **Player Data (`playerDataManager.js`):**
    *   `PlayerAntiCheatData` structure was updated to include new session-specific fields for these checks: `lastPitch`, `lastYaw` (updated each tick), `lastAttackTick` (updated on attack), and `recentHits` (array for multi-target check). These are initialized fresh each session and are not persisted, except for the flags they might generate.
*   **Integration:**
    *   View Snap and Attack While Sleeping checks are triggered from `handleEntityHurt` in `eventHandlers.js`.
    *   Multi-Target check is also triggered from `handleEntityHurt`.
    *   View Snap check is also called in the main tick loop to catch invalid pitch at any time.
*   All new checks use the centralized `playerDataManager.addFlag()` function for reporting violations.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Elaborated on To-Do List Feature Details (Submitted)
*(Date is a placeholder based on current interaction)*

Expanded the descriptions of tasks within `Dev/tasks/todo.md` to provide more specific details and requirements for future feature implementations. This elaboration was based on prior research and a draft of desired functionalities, including inspirations from other anti-cheat systems (Scythe, SjnExe, SafeGuard).

*   **Key Areas of Elaboration:**
    *   **Advanced Cheat Detections:** Added specific sub-check details for Killaura/Aimbot (View Snap thresholds, Multi-Target parameters, state conflict examples), Scaffold/Tower (defining "tower-like", "flat/invalid rotation"), Timer/FastUse/FastPlace (clarifying game speed vs. action speed, examples for FastUse), Advanced Movement (specific conditions for Invalid Y Velocity, NoSlow, InvalidSprint), Advanced World Interaction (detection logic for AutoTool, InstaBreak, X-Ray), Advanced Player Behavior (violation criteria for Namespoof, Anti-GMC, InventoryMods), and Packet Anomalies/Chat Violations (examples for self-hurt, message content/rate issues). Noted SjnExe parity goals where relevant.
    *   **Admin Tools & Management:** For new command ideas (ban, kick, mute, freeze, etc.), specified key parameters (like duration formats) and noted needs for persistent storage (e.g., ban lists). SjnExe parity noted.
    *   **UI Enhancements:** Clarified potential scope for UI features like config editors and log viewers. SjnExe parity noted.
    *   **System Features:** Detailed core mechanics for proposed systems like Owner/Rank systems, Combat Log, and Device Ban. SjnExe parity noted.
    *   **World Management & Protection:** Specified actions for Anti-Grief and Dimension Locks. SjnExe parity noted.
    *   **Logging Enhancements:** Listed key data points for various logging types (command usage, join/leave, punitive actions). SjnExe parity noted.
*   **Outcome:** The `Dev/tasks/todo.md` file now contains a more granular and actionable list of future development tasks, providing clearer guidance for implementation.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Populated To-Do List with New Features (Submitted)
*(Date is a placeholder based on current interaction)*

The `Dev/tasks/todo.md` file was significantly updated by incorporating a comprehensive list of new feature ideas and desired enhancements, largely inspired by functionalities found in other community anti-cheat systems like Scythe, SjnExe, and SafeGuard.

*   **Key Activities:**
    *   Reviewed the provided draft of new features and tasks.
    *   Merged these new items into the existing `Dev/tasks/todo.md` structure.
    *   **Expanded "Advanced Cheat Detections":** Added detailed sub-tasks for Killaura/Aimbot (including specific checks like attacking while using item, no swing, invalid rotations), Scaffold/Tower, Timer/FastUse/FastPlace, advanced Movement checks (Invalid Y Velocity, NoSlow, InvalidSprint), advanced World Interaction checks (AutoTool, InstaBreak, X-Ray), advanced Player Behavior checks (Namespoof, Anti-GMC, InventoryMods), and various Packet Anomalies/Chat Violations.
    *   **Expanded "Admin Tools & Management":** Added numerous new command ideas (`!ac ban`, `kick`, `mute`, `freeze`, `warnings`, `invsee`, `vanish`, `worldborder`, etc.), a Reporting System (`!ac report`), and further UI enhancement ideas (config editor, ban/mute logs, InvSee UI). Also included system-level features like Owner/Rank systems and Combat Log detection.
    *   **Added "World Management & Protection":** New category for features like Anti-Grief and Dimension Locks.
    *   **Updated "Low Priority / Ideas":** Integrated new items like Player Utilities (welcomer, death coords) and Logging Enhancements, while retaining existing relevant tasks.
*   **Outcome:** The `Dev/tasks/todo.md` file now provides a much more detailed and extensive roadmap for future addon development, categorizing a wide range of potential features and improvements.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Refactor: Reorganized Script File Structure (Submitted)
*(Date is a placeholder based on current interaction)*

Completed a major reorganization of the `AntiCheatsBP/scripts/` directory to improve modularity, maintainability, and clarity of the codebase.

*   **Key Structural Changes:**
    *   **`core/` Directory Created:**
        *   `playerDataManager.js`: Centralizes player data management, including the runtime `playerData` map, loading/saving data via dynamic properties, default data initialization, and the new centralized `addFlag` function.
        *   `commandManager.js`: Handles parsing and execution of chat commands (e.g., `!ac version`, `!ac watch`, `!ac ui`).
        *   `uiManager.js`: Manages all admin UI forms (`ActionFormData`, `ModalFormData`, `MessageFormData`) for actions like inspect, reset flags, and list watched players.
        *   `eventHandlers.js`: Contains the callback logic for various world events (`playerLeave`, `entityHurt`, `playerBreakBlock`, `itemUse`, `itemUseOn`).
    *   **`checks/` Directory Created:**
        *   Subdirectories `movement/`, `combat/`, and `world/` were created.
        *   Original monolithic check files (`movementChecks.js`, `combatChecks.js`, `worldChecks.js`) were split into individual files for each specific check (e.g., `flyCheck.js`, `reachCheck.js`, `nukerCheck.js`) and placed in the appropriate subdirectory.
        *   A barrel file `checks/index.js` was created to export all check functions for easy importing.
    *   **`utils/` Directory:**
        *   `playerUtils.js` was moved here (`utils/playerUtils.js`) and updated to only contain general utility functions like `isAdmin`, `warnPlayer`, `notifyAdmins`, `debugLog`. Persistence functions were moved to `playerDataManager.js`.
*   **Refactoring Details:**
    *   **Centralized `addFlag`:** All individual check files were refactored to use the new `addFlag` function in `playerDataManager.js`, removing redundant flagging, notification, and saving logic from each check.
    *   **`main.js` Slimmed Down:** The main script file (`main.js`) now acts as an orchestrator. It initializes modules, subscribes events to handlers in the `core` modules, and runs the main tick loop. Most of its previous direct logic for commands, UI, data management, and event handling has been delegated.
    *   **Import Paths Updated:** All `import` statements across the modified and newly created files were updated to reflect the new file locations and module structure.
*   **Follow-up Considerations:**
    *   Noted that JSDoc typedefs for `PlayerAntiCheatData` and `PlayerFlagData` (currently commented out or assumed in `playerDataManager.js`) should ideally be moved to a separate `types.js` file to resolve potential circular dependencies and improve type management. This is noted as a new task in `todo.md`.

This reorganization significantly enhances the project's structure, making it easier to navigate, maintain, and extend in the future.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Killaura/Aimbot Detection Investigation (Submitted)
*(Date is a placeholder based on current interaction)*

Conducted an investigation into methods for detecting Killaura and Aimbot cheats using the `@minecraft/server` API. This involved reviewing existing community projects, researching common detection techniques, analyzing API capabilities, and outlining potential detection logic.

*   **Key Activities & Findings:**
    *   Reviewed internal documentation and external projects (Scythe Anticheat, SafeGuard Anticheat) for initial insights.
    *   Researched various detection heuristics, including state conflicts, "no swing" attacks (noted as difficult with current API), multi-target analysis, invalid rotation/view snapping, hit consistency, and targeting anomalies.
    *   Assessed the feasibility of these techniques based on available `@minecraft/server` API features (player view/rotation, entity hurt events, player states, target information).
    *   Outlined potential logic for promising checks:
        *   Invalid Rotation / View Snap (Aimbot component).
        *   Multi-Target / Fast Target Switching (Killaura component).
        *   Attacking During Invalid States (e.g., sleeping).
*   **Outcome:**
    *   The detailed findings, API feasibility analysis, outlined detection logic, and recommendations for initial implementation focus (View Snap, Multi-Target Killaura, State Conflict - Sleeping) are documented in the newly created `Dev/KillauraAimbotInvestigation.md` file. This document provides a foundation for future development of these advanced cheat detection modules.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Updated Root README.md (Submitted)
*(Date is a placeholder based on current interaction)*

The main project `README.md` was significantly updated to reflect the current state of the Anti-Cheats Addon, including recent feature additions and providing a more comprehensive guide for users and administrators.

*   **Key Sections Added/Revised:**
    *   **Features:** Summarizes core capabilities including cheat detections (Movement, Combat, World), Admin Tools (text commands and new UI), Configuration options, Data Persistence, and the Player Flagging System.
    *   **Required Experimental Toggles:** Clarified the need for "Beta APIs."
    *   **Setup:** Includes a note on the target Minecraft version (1.21.80+).
    *   **Admin Commands & UI:** Detailed list of available commands, distinguishing between the new `!ac ui` and its sub-menus (Inspect Player, Reset Flags, List Watched) and the existing text-based commands.
    *   **Configuration:** Highlights the role of `config.js` for adjustments.
    *   **Player Usage:** Mentions the `!ac myflags` command.
*   The README now serves as a more accurate and user-friendly documentation for the addon.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Implemented Basic Admin UI (Submitted)
*(Date is a placeholder based on current interaction)*

Implemented a basic Admin User Interface (UI) accessible via the `!ac ui` command. This UI provides administrators with interactive forms for common anti-cheat management tasks.

*   **Access Command:** `!ac ui` (only available to players with the 'admin' tag).
*   **Main Menu (`ActionFormData`):**
    *   Title: "AntiCheat Admin Menu"
    *   Options:
        1.  **Inspect Player Data:**
            *   Uses a `ModalFormData` to prompt for a player's name.
            *   Displays the target player's anti-cheat data (flags, watched status, etc.) in chat, similar to the `!ac inspect` text command.
            *   Includes input validation and error handling for player/data not found.
        2.  **Reset Player Flags:**
            *   Uses a `ModalFormData` to prompt for a player's name and a confirmation toggle.
            *   If confirmed, resets the target player's flags and relevant violation data (e.g., `consecutiveOffGroundTicks`, `attackEvents`, `lastFlagType`, `playerNameTag`, `attackEvents`, `lastAttackTime`, `blockBreakEvents`, `consecutiveOffGroundTicks`, `fallDistance`, `consecutiveOnGroundSpeedingTicks`).
            *   Persists the changes using `prepareAndSavePlayerData`.
            *   Displays a success/error message to the admin using `MessageFormData`.
            *   Notifies other admins of the action.
        3.  **List Watched Players:**
            *   Uses a `MessageFormData` to display a list of all players currently marked as `isWatched: true`.
            *   Shows a message if no players are currently being watched.
*   **General Implementation Details:**
    *   All UI components are implemented in `AntiCheatsBP/scripts/main.js`.
    *   Necessary modules (`ActionFormData`, `ModalFormData`, `MessageFormData`) were imported from `@minecraft/server-ui`.
    *   Includes error handling for form display and processing, with feedback provided to the admin.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Implemented Player Data Persistence (Submitted)
*(Date is a placeholder based on current interaction)*

Implemented a system for persisting key player anti-cheat data (`pData`) across sessions (server restarts, player rejoin/leave). This ensures that player flags, watched status, and relevant violation tracking information are maintained.

*   **Core Mechanism:**
    *   Utilized Entity Dynamic Properties (`player.setDynamicProperty`, `player.getDynamicProperty`) for storing and retrieving player data.
    *   Data is serialized into a JSON string under the key `anticheat:pdata_v1` on the player entity.
*   **Key Functions Implemented:**
    *   **`savePlayerDataToDynamicProperties(player, pDataToSave)`** (in `playerUtils.js`):
        *   Serializes a defined subset of `pData` (including `flags` object, `isWatched`, `lastFlagType`, `playerNameTag`, `attackEvents`, `lastAttackTime`, `blockBreakEvents`, `consecutiveOffGroundTicks`, `fallDistance`, `consecutiveOnGroundSpeedingTicks`) into JSON.
        *   Saves the JSON string to the player's dynamic property.
        *   Includes error handling and size checks.
    *   **`loadPlayerDataFromDynamicProperties(player)`** (in `playerUtils.js`):
        *   Retrieves the JSON string from the player's dynamic property.
        *   Parses the JSON string and returns the reconstituted data object.
        *   Includes error handling and returns `null` if data is not found or corrupted.
    *   **`prepareAndSavePlayerData(player)`** (helper in `main.js`):
        *   Constructs the specific `persistedPData` object from the runtime `pData` map.
        *   Calls `savePlayerDataToDynamicProperties`.
    *   **`initializeDefaultPlayerData(player)`** (helper in `main.js`):
        *   Creates a fresh, default `PlayerAntiCheatData` object for new players or when persisted data is not found/loaded.
*   **Integration Points:**
    *   **Saving Data:**
        *   Data is saved when a player leaves the game (via `world.beforeEvents.playerLeave`).
        *   Data is saved after modifications via admin commands:
            *   `!ac watch` (when `isWatched` status changes).
            *   `!ac resetflags` (after flags and relevant states are cleared).
    *   **Loading Data:**
        *   When a player joins (or is first processed by the `system.runInterval` in `main.js`), the system attempts to load their persisted data using `loadPlayerDataFromDynamicProperties`.
        *   If data is found, it's merged with a default `pData` structure, prioritizing loaded values.
        *   If no data is found, a fresh default `pData` object is used.
*   **Outcome:** This implementation provides a foundational persistence layer. Further work could involve saving data more frequently (e.g., after every flag increment) if deemed necessary, which would require refactoring the flag-adding logic.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Player Data Persistence Investigation (Submitted)
*(Date is a placeholder based on current interaction)*

Conducted an investigation into methods for persisting player anti-cheat data (`pData`) to survive server restarts and player rejoins. The research focused on using Scoreboard Objectives and Entity Dynamic Properties available via the `@minecraft/server` API.

*   **Key Activities:**
    *   Researched the capabilities, pros, and cons of using `world.scoreboard` for numerical data storage.
    *   Researched the capabilities, pros, and cons of using dynamic properties (on `Entity` and `World` objects), particularly with JSON stringification for complex data.
    *   Outlined two potential approaches: one primarily using dynamic properties with JSON, and a hybrid approach.
    *   Provided a recommendation to start with dynamic properties (storing a serialized JSON string of `pData`) due to its flexibility for complex data structures.
*   **Outcome:**
    *   The detailed findings, detailed analysis of each mechanism, potential approaches, and the final recommendation are documented in the newly created `Dev/PersistenceInvestigation.md` file. This document will serve as a basis for the future implementation of data persistence.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Specify Target Minecraft Version (Submitted)
*(Date is a placeholder based on current interaction)*

Clarified the target Minecraft Bedrock version for the addon across relevant project files to ensure consistency in development and usage.

*   **Key Changes:**
    *   **`AntiCheatsBP/manifest.json`:** Updated the `min_engine_version` property in the `header` section from `[1, 21, 0]` to `[1, 21, 80]`.
    *   **`README.md` (Root):** Added a note in the "Setup" section: "**Note:** This addon is designed for Minecraft Bedrock version 1.21.80 and newer."
    *   **`Dev/README.md`:** Added a new section "## Target Minecraft Version" stating: "The addon currently targets Minecraft Bedrock version 1.21.80 and newer. Please ensure development and testing align with this version."

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Admin Command Implementation (`!ac inspect`, `!ac resetflags`) (Submitted)
*(Date is a placeholder based on current interaction)*

Added two new administrative commands to `AntiCheatsBP/scripts/main.js` to enhance server management capabilities:

*   **`!ac inspect <playername>`:**
    *   Allows admins to view a summary of a target player's anti-cheat data (`pData`).
    *   The summary includes the player's `isWatched` status, total flag count, last flag type, and detailed counts and last detection times for each specific cheat category (e.g., fly, speed, cps).
    *   Handles cases where the player or their data is not found.
*   **`!ac resetflags <playername>`:**
    *   Allows admins to reset a target player's accumulated anti-cheat flags and associated violation-tracking metrics.
    *   Resets `pData.flags.totalFlags` to 0, clears `pData.lastFlagType`.
    *   Resets individual flag counts and `lastDetectionTime` for all categories.
    *   Clears stateful violation trackers such as `consecutiveOffGroundTicks`, `fallDistance`, `consecutiveOnGroundSpeedingTicks`, `attackEvents` (for CPS), and `blockBreakEvents` (for Nuker).
    *   Provides confirmation to the issuing admin and notifies other online admins.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Manifest API Versioning Update (Submitted)
*(Date is a placeholder based on current interaction)*

Reviewed and initially updated the versions of `@minecraft/server` and related modules in `AntiCheatsBP/manifest.json` to align with the project's `min_engine_version` of `[1, 21, 0]` and utilize recent beta releases for the `1.21.90` engine preview.

*   **Initial Key Version Changes (to `1.21.90-preview.28` series):**
    *   `@minecraft/server`: Updated from `2.0.0-beta` to `2.1.0-beta.1.21.90-preview.28`.
    *   `@minecraft/server-ui`: Updated from `2.0.0-beta` to `2.1.0-beta.1.21.90-preview.28`.
    *   `@minecraft/server-gametest`: Updated from `1.0.0-beta` to `1.0.0-beta.1.21.90-preview.28`.

*   **Update (Reversion due to User Feedback):**
    *   Based on user feedback, the module versions were reverted to their previous state to maintain compatibility or address other concerns.
    *   **Current Versions:**
        *   `@minecraft/server`: `2.0.0-beta`
        *   `@minecraft/server-ui`: `2.0.0-beta`
        *   `@minecraft/server-gametest`: `1.0.0-beta`
    *   Ensured versioning procedure documentation is correctly named `Dev/VersioningNotes.md`.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Configuration Review & Expansion (Submitted)
*(Date is a placeholder based on current interaction)*

This task involved a comprehensive review and expansion of the `AntiCheatsBP/scripts/config.js` file to improve the configurability and maintainability of the cheat detection system.

*   **Key Changes:**
    *   **Moved Hardcoded Thresholds:** Identified numerical thresholds previously hardcoded within check functions (`combatChecks.js`, `movementChecks.js`) and moved them to `config.js` as named constants. This centralizes configuration and makes tuning easier. Affected thresholds included those for reach buffer, CPS calculation window, various fly detection parameters (sustained speed/ticks, hover speed/ticks/height/fall distance), and speed check tolerances/durations.
    *   **Added Enable/Disable Flags:** Introduced boolean flags in `config.js` for each major cheat detection category (Reach, CPS, Fly, Speed, NoFall, Nuker, Illegal Items). Check functions in their respective files (`combatChecks.js`, `movementChecks.js`, `worldChecks.js`) were updated to respect these flags, allowing administrators to easily toggle entire checks on or off.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Refine `debugLog` Calls (Submitted)
*(Date is a placeholder based on current interaction)*

This task involved reviewing all `debugLog` calls across the primary check functions (`combatChecks.js`, `movementChecks.js`, `worldChecks.js`, `main.js`, `playerUtils.js`) to ensure they adhered to the `debugLog(message, contextPlayerNameIfWatched)` signature.

*   **Outcome:**
    *   The review confirmed that the existing `debugLog` calls were already correctly implemented. Player-specific logs appropriately used the second argument for `contextPlayerNameIfWatched` (often based on `pData.isWatched` status), and general logs used a single argument.
    *   No code modifications were necessary as the implementation already met the requirements for detailed contextual logging for watched players.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Folder Renaming and Path Updates (Submitted)
*(Date is a placeholder based on current interaction)*

This task involved renaming the core Behavior Pack (`BP/`) and Resource Pack (`RP/`) folders to `AntiCheatsBP/` and `AntiCheatsRP/` respectively. All references to these paths within the project's configuration and documentation files were updated accordingly.

*   **Task:** Rename `BP/` and `RP/` folders to `AntiCheatsBP/` and `AntiCheatsRP/` respectively, and update all references.
    *   **Status:** Completed
    *   **Details:**
        *   Renamed the physical folders `BP/` to `AntiCheatsBP/` and `RP/` to `AntiCheatsRP/`.
        *   Updated paths in `.github/workflows/release.yml`.
        *   Updated paths in `Dev/README.md`.
        *   Updated paths in the root `README.md`.
        *   Checked and updated paths in `.gitignore`.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Anti-Cheat Feature Implementation (Submitted)
*(Date is a placeholder based on current interaction)*

This major update introduced a comprehensive suite of anti-cheat features, improved admin tooling, and foundational code enhancements.

**Key Features & Improvements:**

*   **New Cheat Detections:**
    *   Movement: Fly (sustained upward & hover), Speed, NoFall.
    *   Combat: Reach, CPS (AutoClicker).
    *   World: Nuker (rapid block breaking), Illegal Item (use/placement prevention).
*   **Advanced Player Data Tracking:** Implemented a robust `playerData` system for detailed per-player state tracking.
*   **Player Flagging System & Enhanced Notifications:** Players accumulate flags for violations, and admin notifications now include flag counts.
*   **New Admin Commands:**
    *   `!ac version`: Displays AntiCheat version.
    *   `!ac watch <playername>`: Toggles verbose debug logging for a player.
    *   `!ac myflags`: Allows players to check their own flag status.
*   **Code Quality and Maintainability:**
    *   Added comprehensive JSDoc comments to all primary script files.
    *   Standardized `debugLog` usage for enhanced output for "watched" players.
    *   Normalized script file extensions to `.js`.
    *   Reviewed and confirmed `manifest.json` configurations.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Packet Anomalies / Chat Violations
*(Date is a placeholder based on current interaction)*
*   **Newline/Carriage Return in Messages:** Implemented a check in `eventHandlers.js` (`handleBeforeChatSend`) to detect `\n` or `\r` characters in chat messages.
    - Added new flag type `illegalCharInChat` to `types.js` and `playerDataManager.js`.
    - Added configuration options (`enableNewlineCheck`, `flagOnNewline`, `cancelMessageOnNewline`) to `config.js`.
    - The check can be configured to cancel the message and/or flag the player.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

*   **Abnormal Message Lengths:** Extended `handleBeforeChatSend` in `eventHandlers.js` to check for messages exceeding a configurable maximum length.
    - Added new flag type `longMessage` to `types.js` and `playerDataManager.js`.
    - Added configuration options (`enableMaxMessageLengthCheck`, `maxMessageLength`, `flagOnMaxMessageLength`, `cancelOnMaxMessageLength`) to `config.js`.
    - The check can be configured to cancel the message and/or flag the player.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Refactoring
*   **Refactor: Create `types.js`:** Defined common JSDoc typedefs (`PlayerAntiCheatData`, `PlayerFlagData`, etc.) in `AntiCheatsBP/scripts/types.js`. This helps in avoiding potential circular dependencies and improves overall type management for player data structures.

## Mute/Unmute System & Panel Integration (Session-only) - Task Completion Date
- **`playerDataManager.js`**:
    - Added `activeMutes` Map to store session-only mutes (`playerId -> { unmuteTime, reason }`).
    - Implemented `addMute(playerId, durationMs, reason)`: Calculates `unmuteTime` (handles `Infinity` for permanent session mutes) and stores mute details.
    - Implemented `removeMute(playerId)`: Removes mute from the map.
    - Implemented `getMuteInfo(playerId)`: Retrieves mute details; automatically removes and returns `null` for expired mutes.
    - Implemented `isMuted(playerId)`: Helper that uses `getMuteInfo`.
- **`commandManager.js`**:
    - Added `parseDuration(durationString)` helper function to convert inputs like "5m", "1h", "perm" to milliseconds or `Infinity`.
    - Defined and implemented `!mute <player> [duration] [reason]` command (Admin permission):
        - Uses `parseDuration`. Validates duration and player. Prevents self-mute.
        - Calls `playerDataManager.addMute`.
        - Notifies target player via action bar (e.g., "You have been muted for 1h. Reason: Spamming").
        - Notifies admin issuer and other admins via chat.
    - Defined and implemented `!unmute <player>` command (Admin permission):
        *   Validates player. Checks `playerDataManager.isMuted` first.
        *   Calls `playerDataManager.removeMute`.
        *   Notifies target player via action bar (e.g., "You have been unmuted.").
        *   Notifies admin issuer and other admins via chat.
- **`eventHandlers.js` (`handleBeforeChatSend`)**:
    - Integrated mute check at the beginning of chat processing.
    - If player is muted:
        - Cancels the chat event (`eventData.cancel = true`).
        - Sends an action bar message to the muted player displaying their mute status, remaining duration (formatted like "Xm Ys" or "Permanent for this session"), and reason.
- **`uiManager.js` (`showPlayerActionsForm`)**:
    - Added a dynamic "Mute/Unmute Player" button:
        - Text changes to "Mute Player", "Unmute Player (Permanent)", or "Unmute Player (exp. HH:MM:SS)" based on mute status.
        - Icon changes accordingly.
    - Mute action via panel:
        - Prompts admin for duration (minutes or "perm") and reason using a `ModalFormData`.
        - Validates duration input.
        - Calls `playerDataManager.addMute`.
        - Provides feedback to admin (chat) and target (action bar).
    - Unmute action via panel:
        - Prompts admin for confirmation using a `ModalFormData`.
        - Calls `playerDataManager.removeMute`.
        - Provides feedback to admin (chat) and target (action bar).
    - Refreshes the `showPlayerActionsForm` after mute/unmute actions to update button state.

## `!warnings` and `!clearwarnings` Commands - Task Completion Date
- **`commandManager.js`**:
    - Added `!warnings <player>` command (Admin permission):
        - Shows a detailed, multi-line textual summary of a player's flags.
        - Includes total flags, last flag type.
        - For each flag type with a count > 0, displays its name, count, and the last detection timestamp formatted with `toLocaleString()`.
    - Added `!clearwarnings <player>` command (Admin permission):
        - Functionally an alias to `!resetflags`.
        - Clears all flag counts, total flags, last flag type, and other violation trackers (e.g., `consecutiveOffGroundTicks`, `fallDistance`, `attackEvents`).
        - Saves the updated player data.
        - Provides specific "warnings cleared" feedback messages to admins.

## Admin Panel UI & Normal Player Panel Features (from ongoing.md)
As of 2024-07-27

*   **Phase 1: Basic Structure & Player List:** (Completed)
    *   Command `!panel open main` (or similar).
    *   Initial UI form displaying a list of currently online players (name, basic stats like flag count).
    *   Selection of a player leads to a "Player Actions" form.
*   **Phase 1.5: Player Actions Form with Reset Flags & Detailed View:** (Completed)
    *   Player Actions form includes "View Detailed Info/Flags" and "Reset Player Flags" (with confirmation).
*   **Phase 2: Integrate Old `!ui` Tools & Dynamic Views:** (Completed with this commit)
    *   Consolidated `!ui` and `!panel` commands. `!panel` is primary, `!ui` is an alias.
    *   `showAdminPanelMain` in `uiManager.js` now dynamically shows:
        *   For Admins/Owners: Buttons for "View Online Players", "Inspect Player (Text)", "Reset Flags (Text)", "List Watched Players", and placeholders for Server Stats/Settings.
        *   For Normal Users: Placeholders for "My Stats", "Server Rules", "Help & Links".
*   **Phase 3: Player Actions - Moderation (TODO)**:
    *   "Kick Player" button with reason input (integrates with kick system). (Completed)
    *   "Mute Player" button with duration/reason input (integrates with mute system). (Completed)
    *   "Freeze/Unfreeze Player" toggle (integrates with freeze system). (Completed)

## Normal Player Panel Features (`!panel`)
*   Implement "My Stats" view for normal players in `!panel`. (Completed)
*   Implement "Server Rules" view for normal players in `!panel`. (Completed)
*   Implement "Help & Links" view for normal players in `!panel`. (Completed)

## Implement Persistent Mute System (Task Completion Date)

**Original Task Description:**
`!ac mute <player> [duration] [reason]` & `!ac unmute <player>`: Implement a persistent mute system. Mutes should be persistent (e.g., stored in a world dynamic property or separate file if platform allows). Duration format (e.g., "1d", "2h30m", "perm"). (Inspired by SjnExe, SafeGuard)

**Summary of Implementation:**
*   Modified `playerDataManager.js`:
    *   Added `muteInfo: null` to the default player data structure in `initializeDefaultPlayerData`.
    *   Included `pData.muteInfo` in `persistedPData` within `prepareAndSavePlayerData` for saving to dynamic properties.
    *   Updated `ensurePlayerDataInitialized` to load `muteInfo` from dynamic properties and to include logic that clears expired mutes upon player data initialization.
    *   Removed the global `activeMutes` map.
    *   Refactored `addMute`, `removeMute`, `getMuteInfo`, and `isMuted` functions to operate on `pData.muteInfo` (stored per player) instead of the global map. These functions now accept the full `player` object.
    *   Removed the `getActiveMuteCount` function as it was tied to the global map.
*   Updated Callers:
    *   Modified `commandManager.js`: Updated `!mute` and `!unmute` command handlers to pass the `targetPlayer` object (instead of `targetPlayer.id`) to `playerDataManager.addMute`, `playerDataManager.removeMute`, and `playerDataManager.isMuted`.
    *   Modified `eventHandlers.js`: Updated `handleBeforeChatSend` to pass the `eventData.sender` object (player object) to `playerDataManager.isMuted` and `playerDataManager.getMuteInfo`.
    *   Modified `uiManager.js`:
        *   Updated `showPlayerActionsForm` to pass the `targetPlayer` object to `playerDataManager.getMuteInfo`, `playerDataManager.addMute`, and `playerDataManager.removeMute`.
        *   Updated `showSystemInfo` to calculate `mutedPlayersCount` by iterating through all players and checking their persisted `muteInfo`, replacing the call to the removed `getActiveMuteCount`.

*User testing required to fully verify persistence across server restarts and player sessions.*

## Implement Persistent Ban System (Task Completion Date)

**Original Task Description:**
`!ac ban <player> [reason] [duration]` & `!ac unmute <player>`: Implement a ban management system. Bans should be persistent (e.g., stored in a world dynamic property or separate file if platform allows). Duration format (e.g., "1d", "2h30m", "perm"). (SjnExe, SafeGuard)

**Summary of Implementation:**
*   **Modified `playerDataManager.js`:**
    *   Added `banInfo: null` to the default player data structure in `initializeDefaultPlayerData`.
    *   Included `pData.banInfo` in `persistedPData` within `prepareAndSavePlayerData` for saving to dynamic properties.
    *   Updated `ensurePlayerDataInitialized` to load `banInfo` from dynamic properties and to include logic that clears expired bans upon player data initialization.
    *   Created new functions: `addBan(player, durationMs, reason)`, `removeBan(player)`, `getBanInfo(player)`, and `isBanned(player)` to manage persistent ban data, including saving changes to dynamic properties.
*   **Modified `eventHandlers.js`:**
    *   In `handlePlayerSpawn`, added logic to call `playerDataManager.getBanInfo(player)`. If an active ban is found, the player is kicked from the server with a detailed ban message including the reason and expiration (or permanent status).
*   **Modified `commandManager.js`:**
    *   Added `!ac ban <player> [duration] [reason]` command:
        *   Allows administrators to ban a player with a specified duration (e.g., "7d", "2h", "perm") and reason.
        *   The command parses the duration, applies the ban using `playerDataManager.addBan`, and then kicks the banned player with a message detailing the ban reason and duration.
        *   Admins are notified of the action.
    *   Added `!ac unban <player>` command:
        *   Allows administrators to unban a player.
        *   The command uses `playerDataManager.removeBan` to remove the ban information for the specified (online) player.
        *   Admins are notified.
        *   A note was included in the implementation that the current `!unban` command primarily targets online players, and full offline player unbanning might require further enhancements.

*UI integration for ban/unban in the admin panel is deferred for a future task.*

## Admin Panel UI (`!panel`) Development (Phase 4 Completed)
*(Task Completion Date)*

*   **Phase 4: Server Management Actions (New Section in Panel) (Completed):**
    *   A new "Server Management" section was added to the main Admin Panel (`!panel`).
    *   "View System Info": Integrated the existing system information display into this new panel section. Admins can view basic server stats and AC version. (Completed - Integrated into Server Management Panel)
    *   "Clear Chat" button: Implemented a button that allows admins to clear chat for all players after a confirmation prompt. (Completed)
    *   "Lag Clear" button: Implemented a button that allows admins to remove all dropped item entities from all standard dimensions (Overworld, Nether, End) after a confirmation prompt. Reports the number of items cleared. (Completed)

## Persistent Admin Action Logging & UI Viewer (Task Completion Date)

**Original Task Description (from ongoing.md, merged from todo.md):**
Implement Persistent Logging & UI Viewer for Admin Actions (Ban, Mute, Kick): Log actions with details (admin, target, reason, duration, timestamp) and create a UI to view these logs.

**Summary of Implementation:**
*   Implemented a persistent logging system for admin actions (ban, unban, mute, unmute, kick).
*   Created `AntiCheatsBP/scripts/core/logManager.js` to handle log storage (in world dynamic property `anticheat:action_logs_v1`) and retrieval, with log rotation (max 200 entries). Key functions include `addLog`, `getLogs`, and `clearAllLogs_DEV_ONLY`.
*   Integrated `logManager.addLog()` calls into `commandManager.js` for relevant text commands (`!ban`, `!unban`, `!mute`, `!unmute`, `!kick`) and into `uiManager.js` for actions performed via the Admin Panel (`showPlayerActionsForm`).
*   Added a "View Action Logs" button to the "Server Management" section of the Admin Panel (`!panel`) in `uiManager.js`.
*   Implemented `showActionLogsForm` in `uiManager.js` to display the latest 50 formatted log entries (timestamp, admin, action, target, duration, reason) in a read-only view, with navigation back to the server management form.
*   This completes a major part of "Phase 5: Configuration & Advanced (Future)" from `ongoing.md` and the "Ban/Mute/Kick Action Logging" task originally from `todo.md`.

## Admin Panel Config Editing, TP, and Gamemode Commands (Completed on 2025-06-05)

*   **Admin Panel UI (`!panel`) Development:**
    *   **View/Edit parts of `config.js`:** Implemented editing of simple configuration values (booleans, strings, numbers) in `config.js` via the Admin Panel. Changes are made in memory for the current session. This completes the task: "View/Edit parts of `config.js`: (View read-only: Completed; Edit simple values: TODO)".
*   **New Admin Commands (User Suggested):**
    *   **`!tp <playerName>` & `!tp <x> <y> <z>`:** Implemented teleport command for admins/owner.
        *   Supports teleporting a player to another player.
        *   Supports teleporting a player (or self) to coordinates `x y z`.
        *   Includes optional dimension parameter (`overworld`, `nether`, `end`). If omitted, defaults to the relevant player's current dimension.
        *   This completes the task: "`!tp <playerName>` & `!tp <x> <y> <z>`: Implement teleport command for admins/owner. (User Suggestion) (TODO)" including its enhancement.
    *   **`!gmc`, `!gms`, `!gma`, `!gmsp`:** Implemented game mode change commands for admins/owner.
        *   Allows changing gamemode (Creative, Survival, Adventure, Spectator) for self or a target player.
        *   This completes the task: "`!gmc`, `!gms`, `!gma`, `!gmsp`: Implement game mode change commands for admins/owner. (User Suggestion) (TODO)".

## Documentation Update (Completed on 2025-06-05)

*   **Standardize Command Syntax in `Dev/tasks/todo.md`:**
    *   Reviewed `Dev/tasks/todo.md` and updated all suggested administrative command syntaxes from the `!ac <command>` format to `!<command>` (e.g., `!ac kick` changed to `!kick`).
    *   This ensures that command suggestions in the to-do list are consistent with the established command prefix (`!`) used for existing commands.
    *   Updated a related line in the logging section of `todo.md` to refer to `!` commands generally.

## Admin Command Verification (Completed on 2025-06-05)

*   **`!kick <player> [reason]` Command:**
    *   Task was to implement the `!kick` command.
    *   Upon review of `AntiCheatsBP/scripts/core/commandManager.js`, it was found that the `!kick` command is already implemented.
    *   The existing implementation correctly handles:
        *   Syntax: `!kick <playername> [reason]`
        *   Permissions: `permissionLevels.admin`
        *   Player lookup.
        *   Self-kick prevention.
        *   Kicking the player using `player.kick(reason)`.
        *   Notification to the admin issuer and other admins.
        *   Logging the kick action via `addLog`.
        *   Error handling for player not found or kick failure.
    *   No new implementation was needed. This task is considered completed by verification.

## Command Enhancement (Completed on 2025-06-05)

*   **`!freeze <player> [on|off]` Command Logging:**
    *   Enhanced the existing `!freeze` command in `AntiCheatsBP/scripts/core/commandManager.js`.
    *   Added `addLog` calls for both freeze and unfreeze actions.
    *   Log entries include timestamp, admin name, action type ('freeze'/'unfreeze'), target player name, and details.
    *   This ensures that administrative freeze/unfreeze actions are now properly logged for auditing.

## Admin Commands Implementation (Completed on 2025-06-05)

*   **`!warnings <player>` Command:**
    *   Implemented in `AntiCheatsBP/scripts/core/commandManager.js`.
    *   Displays a detailed list of the target player's flags, including total flags, last flag type, and individual flag counts with timestamps.
    *   Handles cases for player/data not found.
    *   Logs the action using `addLog` with `actionType: 'view_warnings'`.
*   **`!resetflags <player>` Command:**
    *   Implemented in `AntiCheatsBP/scripts/core/commandManager.js` (alongside `!clearwarnings` due to functional similarity).
    *   Resets all flag counts (total and individual), clears the last flag type, and resets other violation-specific trackers (e.g., `consecutiveOffGroundTicks`).
    *   Persists changes using `playerDataManager.prepareAndSavePlayerData()`.
    *   Sends feedback to the admin and notifies other admins.
    *   Logs the action using `addLog` with `actionType: 'reset_flags'`.
*   **`!clearwarnings <player>` Command:**
    *   Implemented in `AntiCheatsBP/scripts/core/commandManager.js`.
    *   Functionally mirrors `!resetflags` in terms of resetting player flag data and violation trackers.
    *   Provides specific "Warnings cleared" feedback messages.
    *   Logs the action using `addLog` with `actionType: 'clear_warnings'`, distinguishing it from a direct `!resetflags` invocation.

## Admin Command Implementation (Completed on 2025-06-05)

*   **`!invsee <playername>` Command:**
    *   Implemented in `AntiCheatsBP/scripts/core/commandManager.js`.
    *   Allows an admin to view a read-only representation of a target player's main inventory (36 slots).
    *   Accessed `EntityInventoryComponent` and its `container` to iterate through slots and `ItemStack` objects.
    *   Displays item details: slot number, type ID, amount, custom name tag, lore, durability (from `ItemDurabilityComponent`), and enchantments (from `ItemEnchantableComponent` and `Enchantment` details).
    *   Uses `MessageFormData` for UI display, presenting the inventory in a scrollable list.
    *   Logs the action using `addLog` with `actionType: 'invsee'`.
    *   Handles cases for player not found or inventory inaccessible.

## UI Enhancements (Completed on 2025-06-05)

*   **`!panel` Icon Enhancement:**
    *   Enhanced `AntiCheatsBP/scripts/core/uiManager.js` by adding icons to dynamically generated player buttons in the `showOnlinePlayersList` function. Used `"textures/ui/icon_steve"` for these player buttons.
    *   Verified that other main navigation buttons in `showAdminPanelMain`, `showPlayerActionsForm`, and `showServerManagementForm` already had appropriate icons.
    *   This improves the visual consistency and appeal of the admin panel.

## Command Enhancement (Completed on 2025-06-05)

*   **`!clearchat` Command Logging:**
    *   Enhanced the existing `!clearchat` command in `AntiCheatsBP/scripts/core/commandManager.js`.
    *   Added an `addLog` call to record when the command is used.
    *   Log entries include timestamp, admin name, action type ('clear_chat'), and details.
    *   This ensures that this global administrative action is logged for auditing.

## Admin Command Implementation (Completed on 2025-06-05)

*   **`!systeminfo <playername>` Command:**
    *   Implemented in `AntiCheatsBP/scripts/core/commandManager.js`.
    *   Allows an admin to view client system information for a target player.
    *   Retrieves and displays:
        *   Platform Type (e.g., Windows, Android) from `player.clientSystemInfo.platformType`.
        *   Max Render Distance from `player.clientSystemInfo.maxRenderDistance`.
        *   Memory Tier from `player.clientSystemInfo.memoryTier`.
        *   Last Input Mode (e.g., MouseKeyboard, Touch) from `player.inputInfo.lastInputModeUsed`.
        *   Graphics Mode (e.g., Fancy, Simple) from `player.graphicsMode`.
    *   Defaults to "N/A" if a specific piece of info is unavailable.
    *   The action is logged using `addLog` with `actionType: 'system_info'`.
    *   Handles cases for player not found or errors during info retrieval.

## Documentation: README Overhaul and LICENSE Creation
*(Date: Current Session)*

A comprehensive review and update of project documentation was performed.

*   **Main `README.md` Enhancements:**
    *   Conducted a thorough review for clarity, conciseness, accuracy, and formatting.
    *   Added a Table of Contents for improved navigation.
    *   Integrated a new "Contributing" section with general guidelines and a link to `Dev/README.md`.
    *   Systematically compacted content across all sections to make the README more direct and easier to digest, while retaining essential information. This included reformatting the Admin Text Commands into a table and summarizing detailed examples (like rank display formats).
*   **LICENSE File:**
    *   Created a new `LICENSE` file in the repository root.
    *   Populated it with the standard MIT License text, using appropriate placeholders for the year and copyright holder ("The Project Contributors").
*   **README License Section Update:**
    *   Initially, a "License" section with placeholder text was added to `README.md`.
    *   This section was subsequently removed from `README.md` (along with its ToC entry) in favor of the dedicated `LICENSE` file.

These changes significantly improve the project's documentation, making it more accessible, informative, and professional.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Admin Tools: `!help [command]` Implementation
*(Date: Current Session)*

Verified existing `!help` command functionality in `commandManager.js`. The command already supported listing available commands based on permission level and providing detailed help for specific commands (e.g., `!help <commandName>`). Ensured it was correctly documented in `README.md` for general users. No significant code changes were required as the feature was largely pre-existing.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Player Features: User Information UI (`!uinfo`)
*(Date: Current Session)*

Implemented the `!uinfo` command, which provides a user interface for players to view their own anti-cheat flag statistics, server rules, and helpful links/tips. This feature was developed as 'Public Info UI Development - Phase 1' from the todo list. The command uses ActionFormData for navigation and MessageFormData for displaying information, all handled within `commandManager.js`. Updated `README.md` to include this new command.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Features: Player Reporting System (`!report` & `!viewreports`)
*(Date: Current Session)*

Implemented a player reporting system. Players can use `!report <player> <reason>` to submit reports, which are stored persistently (capped at 100, FIFO) using `world.setDynamicProperty` via a new `reportManager.js` module. Admins can use `!viewreports` to list reports (optionally filtered by player name), view details of a specific report (using `ActionFormData` and `MessageFormData`), and clear all reports or a report by its ID (with `ModalFormData` confirmation). All functionality is integrated into `commandManager.js`. `README.md` was updated to document the new commands.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Refactoring: Modular Command System (`commandManager.js` Overhaul)
*(Date: Current Session)*

Completed a major refactoring of `commandManager.js`. All 26 commands were migrated to individual modules within a new `AntiCheatsBP/scripts/commands/` directory. `commandManager.js` now dynamically loads commands from `AntiCheatsBP/scripts/commands/commandRegistry.js` and dispatches execution to the respective modules. This change significantly improves code organization, maintainability, and scalability of the command system. Helper functions like `findPlayer` and `parseDuration` were centralized in `playerUtils.js`. `README.md` was also reviewed and updated for command consistency.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Admin Panel: Quick Actions (Kick/Mute/Ban) in Player Inspection UI
*(Date: Current Session)*

Enhanced the Admin Panel's player inspection UI (`showPlayerActionsForm` in `uiManager.js`). Added a 'Ban Player' button and integrated its functionality. Refactored 'Kick Player' and 'Mute/Unmute Player' actions to consistently use their respective command modules (`kick.js`, `mute.js`, `ban.js`) by passing the `dependencies` object (including `commandModules`) through the UI call stack originating from `panel.js`. This allows the UI to leverage the centralized command logic for these actions, including input gathering via `ModalFormData` for reasons and durations.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Admin Panel UI: Integrated Player Inventory View (InvSee)
*(Date: Current Session)*

Enhanced the Admin Panel's player inspection UI (`showPlayerActionsForm` in `uiManager.js`) by adding a 'View Inventory (InvSee)' button. This button's action calls the `execute` method of the `invsee.js` command module, allowing admins to view a target player's inventory directly from the UI. The `invsee.js` module displays the inventory in its own form, and the admin is returned to the player actions menu afterwards.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Documentation: Removed Text Commands Section from README.md
*(Date: Current Session)*

Removed the '### Text Commands' subsection and its table from the '## Admin Commands & UI' section in the root `README.md`. Updated the section to focus on the Admin UI Panel (`!panel`) and direct users to the in-game `!help` command for command details.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Admin Panel UI: View Moderation Logs (Bans/Mutes)
*(Date: Current Session)*

Implemented a UI for viewing Ban/Unban and Mute/Unmute logs within the Admin Panel. Added 'View Moderation Logs' to the Server Management form (`showServerManagementForm`). This leads to a new UI flow (`showModLogTypeSelectionForm`) allowing selection of log type (Ban/Unban or Mute/Unmute) and optional filtering by player name. Logs are fetched from `logManager` and displayed in a `MessageFormData` (`showLogViewerForm`). Handled in `uiManager.js`.

---
*(Date: Current Session)*
*   **Self-Hurt Detection:** Detect if a player takes damage without a clear external source (e.g., another entity, fall, fire). Requires careful context analysis to avoid false positives from suffocation, void, etc. (Scythe 'BadPackets') - Implemented basic check for direct self-attack (`entityAttack` where player is a damaging entity to self).
---
*(Date: Current Session)*
*   **Messages Too Close Together (Spam):** Track time between messages from a player. Flag if messages are sent faster than a reasonable typing/command speed. (SafeGuard) - Implemented `checkMessageRate` and integrated into `handleBeforeChatSend`. Note: The `handleBeforeChatSend` signature in `main.js` needs to be updated to pass new arguments (checks, logManager, executeCheckAction, currentTick).
---
*(Date: Current Session)*
*   **Message Too Many Words (Spam/Flood):** Check word count of messages. Flag if excessively high. (SafeGuard) - Implemented `checkMessageWordCount` and integrated into `handleBeforeChatSend`. `main.js` was also updated to support new `handleBeforeChatSend` signature.
---
*(Date: Current Session)*
*   **Refactor `commandManager.js`**: Split commands into individual modules under a new `commands/` directory to improve organization and maintainability. `commandManager.js` will become a command loader and dispatcher. - Task verified as already completed; `commandManager.js` currently loads commands from modules listed in `commands/commandRegistry.js`.
---
*(Date: Current Session)*
*   **Performance Optimization:** (from original todo) Profile existing checks under load and optimize if necessary.
    *   Reviewed `flyCheck.js` and `speedCheck.js`.
    *   Implemented minor optimization in `flyCheck.js`: removed a redundant lookup for the levitation effect.
    *   No immediate low-risk optimizations found for `speedCheck.js`.
    *   **Suggestion for Future Consideration**: Centralize `player.getEffects()` calls (e.g., in `main.js` per tick) and store results in `pData` to reduce potentially expensive native API calls if performance issues arise. This would be a more significant refactor.
---
*(Date: Current Session)*
*   **Aggressive Code Reduction Review - Phase 1: `playerUtils.js`**:
    *   **Objective:** Review `AntiCheatsBP/scripts/utils/playerUtils.js` for code reduction.
    *   **Outcome:** Successfully refactored several functions (`getPlayerPermissionLevel`, `notifyAdmins`, `debugLog`, `findPlayer`) using more concise JavaScript idioms like ternary operators, `Array.prototype.find()`, and boolean short-circuiting. This resulted in an estimated 12-14 Lines of Code reduction while preserving functionality and performance. Usage of template literals in `executeLagClear` was also confirmed.