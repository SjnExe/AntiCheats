# Completed Tasks

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

## Standardize Naming Convention in `config.js` (Submitted: 2024-07-26)
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

## Created and Named Coding Style Guide (Submitted: 2024-07-25)
*(Date is a placeholder based on current interaction)*

Created a new documentation file, now named `Dev/CodingStyle.md`, to outline coding style conventions for the project. This includes naming conventions for variables (camelCase for config exports, general variables, functions; PascalCase for classes), JSDoc usage, and general formatting. The file was initially named `Dev/CODING_STYLE.md` and subsequently renamed to `Dev/CodingStyle.md`.

*   **Key Contents of `Dev/CodingStyle.md`:**
    *   Naming conventions for config variables, general variables, functions, classes, and constants.
    *   Guidelines for JSDoc comments and typedefs.
    *   Emphasis on following existing code formatting for consistency.
*   This document serves as a reference for maintaining code readability and uniformity across the project.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Implemented Initial Killaura/Aimbot Checks (v1) (Submitted: 2024-07-25)
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

## Elaborated on To-Do List Feature Details (Submitted: 2024-07-25)
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

## Populated To-Do List with New Features (Submitted: 2024-07-25)
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

## Refactor: Reorganized Script File Structure (Submitted: 2024-07-25)
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

## Killaura/Aimbot Detection Investigation (Submitted: 2024-07-25)
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

## Updated Root README.md (Submitted: 2024-07-25)
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

## Implemented Basic Admin UI (Submitted: 2024-07-25)
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
            *   If confirmed, resets the target player's flags and relevant violation data (e.g., `consecutiveOffGroundTicks`, `attackEvents`).
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

## Implemented Player Data Persistence (Submitted: 2024-07-25)
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

## Player Data Persistence Investigation (Submitted: 2024-07-25)
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

## Specify Target Minecraft Version (Submitted: 2024-07-25)
*(Date is a placeholder based on current interaction)*

Clarified the target Minecraft Bedrock version for the addon across relevant project files to ensure consistency in development and usage.

*   **Key Changes:**
    *   **`AntiCheatsBP/manifest.json`:** Updated the `min_engine_version` property in the `header` section from `[1, 21, 0]` to `[1, 21, 80]`.
    *   **`README.md` (Root):** Added a note in the "Setup" section: "**Note:** This addon is designed for Minecraft Bedrock version 1.21.80 and newer."
    *   **`Dev/README.md`:** Added a new section "## Target Minecraft Version" stating: "The addon currently targets Minecraft Bedrock version 1.21.80 and newer. Please ensure development and testing align with this version."

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Admin Command Implementation (`!ac inspect`, `!ac resetflags`) (Submitted: 2024-07-25)
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

## Manifest API Versioning Update (Submitted: 2024-07-25)
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

## Configuration Review & Expansion (Submitted: 2024-07-25)
*(Date is a placeholder based on current interaction)*

This task involved a comprehensive review and expansion of the `AntiCheatsBP/scripts/config.js` file to improve the configurability and maintainability of the cheat detection system.

*   **Key Changes:**
    *   **Moved Hardcoded Thresholds:** Identified numerical thresholds previously hardcoded within check functions (`combatChecks.js`, `movementChecks.js`) and moved them to `config.js` as named constants. This centralizes configuration and makes tuning easier. Affected thresholds included those for reach buffer, CPS calculation window, various fly detection parameters (sustained speed/ticks, hover speed/ticks/height/fall distance), and speed check tolerances/durations.
    *   **Added Enable/Disable Flags:** Introduced boolean flags in `config.js` for each major cheat detection category (Reach, CPS, Fly, Speed, NoFall, Nuker, Illegal Items). Check functions in their respective files (`combatChecks.js`, `movementChecks.js`, `worldChecks.js`) were updated to respect these flags, allowing administrators to easily toggle entire checks on or off.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Refine `debugLog` Calls (Submitted: 2024-07-25)
*(Date is a placeholder based on current interaction)*

This task involved reviewing all `debugLog` calls across the primary check functions (`combatChecks.js`, `movementChecks.js`, `worldChecks.js`, `main.js`, `playerUtils.js`) to ensure they adhered to the `debugLog(message, contextPlayerNameIfWatched)` signature.

*   **Outcome:**
    *   The review confirmed that the existing `debugLog` calls were already correctly implemented. Player-specific logs appropriately used the second argument for `contextPlayerNameIfWatched` (often based on `pData.isWatched` status), and general logs used a single argument.
    *   No code modifications were necessary as the implementation already met the requirements for detailed contextual logging for watched players.

*Associated Commit SHA (if available/relevant for tracking):* [Insert Commit SHA Here if known]

## Folder Renaming and Path Updates (Submitted: 2024-07-25)
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

## Anti-Cheat Feature Implementation (Submitted: 2024-07-24)
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

## Implement Persistent Mute System (Task Completion Date: 2024-07-28)

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
