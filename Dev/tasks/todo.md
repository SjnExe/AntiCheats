# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## High Priority / Next Up
*No high priority tasks currently identified.*

## Medium Priority

*   **Advanced Cheat Detections:**
    *   **Implement Killaura/Aimbot detection** (based on investigation in `Dev/Killaura_Aimbot_Investigation.md`). SjnExe parity goal.
        *   **View Snap / Invalid Rotation:** Detect changes in pitch/yaw exceeding thresholds (e.g., pitch > 60°/tick, yaw > 90°/tick) during or immediately after combat. Check for absolute invalid rotations (e.g., pitch > 90° or < -90°).
        *   **Multi-Target Killaura:** Track recently attacked entities. Flag if >N (e.g., 3) distinct entities are attacked within a very short window (e.g., 1-2 seconds).
        *   **State Conflicts:**
            *   *Attacking while using an item:* Flag if an attack occurs while the player is in a state considered "using an item" (e.g., eating food, drawing a bow, using a shield) that should prevent attacks. Requires custom state tracking. (Scythe, SjnExe)
            *   *Attacking while sleeping:* Flag if an attack occurs while `player.isSleeping` is true. (Scythe, SjnExe)
            *   *Attacking while chest open:* (Low feasibility with current API) Investigate if any event or state reliably indicates an open container UI. (Scythe)
        *   *"No Swing" detection:* (Needs further API feasibility check) Investigate if server-side damage events can be correlated with client-side swing animations/packets, though direct detection is likely difficult. (Scythe)

    *   **Scaffold/Tower Detection:** SjnExe parity goal.
        *   **Tower-like Upward Building:** Detect rapid, continuous upward pillar building significantly faster than manual placement, especially if combined with unusual look angles.
        *   **Flat/Invalid Rotation While Building:** Detect if player is placing blocks (especially in complex patterns like scaffolding) while maintaining an unnaturally static or limited range of head rotation (e.g., always looking straight down or perfectly horizontal).
        *   **Placing Blocks Under Self While Looking Up:** Detect if player is placing blocks beneath their feet to pillar upwards while their pitch indicates they are looking upwards (away from the placement area).
        *   **Downward Scaffold:** Detect rapid placement of blocks downwards while airborne, especially if player maintains horizontal speed.
        *   **Placing Blocks onto Air/Liquid:** Detect block placements where the targeted block face is air or a liquid, without valid support, indicative of scaffold-like behavior.

    *   **Timer/FastUse/FastPlace:** SjnExe parity goal.
        *   **Timer (Game Speed):** Investigate methods to detect if overall game tick or player action processing speed is unnaturally altered. This is complex and may have limited server-side detectability. (Original todo)
        *   **FastUse/FastPlace:** Monitor the time between consecutive uses of items (e.g., firing bows/crossbows, throwing pearls/snowballs, eating food) or placement of blocks. Flag if these actions occur faster than humanly possible or vanilla game limits allow. (Scythe, SjnExe)

    *   **Movement - Advanced:** SjnExe parity goal.
        *   **Invalid Y Velocity / High Velocity:** Monitor `player.getVelocity().y`. Flag if vertical velocity exceeds thresholds not achievable through normal means (e.g., super-jump without effects, excessive upward dash). (SafeGuard, SjnExe 'High Velocity')
        *   **NoSlow:** Detect if player maintains normal walking/sprinting speed while performing actions that should slow them down (e.g., using a bow, eating, sneaking over certain blocks if applicable). Requires tracking player speed against their current action state. (Scythe, SjnExe)
        *   **InvalidSprint:** Detect sprinting under conditions where it should be impossible (e.g., while movement is impaired by blindness, while actively sneaking, while riding an entity that doesn't permit player sprinting). (Scythe)

    *   **World Interaction - Advanced:** SjnExe parity goal.
        *   **AutoTool:** Monitor `player.selectedSlot` changes in conjunction with block break events. Detect if player's selected slot almost instantaneously switches to the optimal tool for breaking a block type just before the break occurs, and then potentially switches back. (Scythe)
        *   **InstaBreak:** Detect breaking of blocks that are typically unbreakable (e.g., bedrock, barriers, command blocks by non-ops) or blocks broken significantly faster than possible even with enchantments/effects. (Scythe)

    *   **Player Behavior - Advanced:** SjnExe parity goal.
        *   **Namespoof:** Check `player.nameTag` for excessive length, use of disallowed characters (e.g., non-ASCII, control characters beyond typical gameplay names), or rapid changes. (Scythe, SjnExe)
            *   *Note: Concern raised about potential false positives for console players (e.g., due to spaces, specific character sets, or typical console Gamertag lengths). Ensure implementation is flexible or provides configuration to handle this when developing this feature.*
        *   **Anti-Gamemode Creative (Anti-GMC):** If a player is unexpectedly in Creative mode (not an admin or by legitimate means), flag and potentially switch them back to Survival. Notify admins. (SafeGuard, SjnExe)
        *   **InventoryMods (Hotbar Switch):** Detect if items are moved or used from the hotbar in ways that are impossible manually, e.g., switching active slot and using an item in the same tick, or moving items in inventory while performing other actions that should lock inventory. (Scythe - may require careful API event correlation)

    *   **Packet Anomalies / Chat Violations:**
        *   **Self-Hurt Detection:** Detect if a player takes damage without a clear external source (e.g., another entity, fall, fire). Requires careful context analysis to avoid false positives from suffocation, void, etc. (Scythe 'BadPackets')
        *   **Invalid Max Render Distance:** (API Dependent) If client settings like render distance are accessible or inferable and an invalid value is detected, flag. (Scythe 'BadPackets')
        *   **Messages Too Close Together (Spam):** Track time between messages from a player. Flag if messages are sent faster than a reasonable typing/command speed. (SafeGuard)
        *   **Message Too Many Words (Spam/Flood):** Check word count of messages. Flag if excessively high. (SafeGuard)
        *   **Sending Messages During Invalid States:** Detect if player sends chat messages while performing actions that should normally restrict chat input (e.g., actively in combat, using an item, chest open - API feasibility varies). (Scythe 'BadPackets')

*   **Admin Tools & Management (Expansion):** SjnExe parity goal where applicable.
    *   **Enhanced Commands:**
        *   `!copyinv <playername>`: Admin copies another player's inventory to their own.
        *   `!vanish`: Toggles admin visibility (requires careful implementation, may involve effects, nametag changes, and potentially packet manipulation if API allows, otherwise limited).
        *   `!worldborder <get|set|remove> [params...]`: Manage a configurable world border (API dependent for enforcement).
        *   `!lagclear`: Attempt to clear ground items or other entities known to cause lag (requires careful targeting).
        *   `!systeminfo <playername>`: Display client details if the API provides access (e.g., device, ping - often limited).
        *   `!notify <on|off|toggle>`: Toggle admin notifications for themselves globally. (Scythe/SafeGuard)
        *   `!help [command]`: Display a list of available AC commands and their usage. (Scythe/SafeGuard)
    *   **Reporting System:** (SafeGuard)
        *   `!report <player> [reason]`: Allows players to report others. Reports stored persistently for admin review.
        *   `!viewreports [playername|clearall]`: Admins can view reports, optionally filtered by player, or clear all reports.
    *   **UI Enhancements (Admin Panel Concept):** SjnExe parity goal.
        *   *(Existing: Base UI with Inspect, Reset Flags, List Watched)*
        *   Investigate: In-game config editor via UI (for `config.js` values).
        *   Add Ban/Mute/Kick/Warn direct actions to player lists or player inspection results within the UI.
        *   Investigate: View Ban/Mute/Warning Logs in UI (requires persistent logging of these actions).
        *   Investigate: Player inventory view (InvSee) within the UI.
    *   **System Features:** SjnExe parity goal.
        *   **Owner System:** Designate a single player (e.g., via `config.js` or first admin) as "Owner" with immutable admin rights and potentially exclusive commands. *(Core functionality implemented as part of Rank System via `ownerPlayerName` in `config.js`)*
        *   **Rank System:** Visual rank system with chat and nametag display. *(Core functionality IMPLEMENTED)*
            -   **Ranks & Criteria:** *(IMPLEMENTED: Owner, Admin, Member defined; Owner via `ownerPlayerName` in `config.js`, Admin via `adminTag`)*
            -   **Chat Display:** *(IMPLEMENTED: Rank prefix like `[Owner] PlayerName: message` with colors)*
            -   **Nametag Display:** *(IMPLEMENTED: Rank above player name like `Owner\nPlayerName` with colors. Nametag modification via `player.nameTag` was successful.)*
            -   Permissions for AC commands could be tied to ranks. *(Still to do)*
            -   Requires persistent storage if not solely derived from config/tags at runtime. *(Still relevant; current implementation is runtime derived from config/tags)*
        *   **Combat Log Detection & Punishment:** If a player leaves the game shortly after entering combat (e.g., being hit or hitting someone), flag them or apply a configurable punishment. (SafeGuard)
        *   Investigate: Device Ban (highly API dependent, likely difficult/impossible with Script API alone, might involve external database if server has such capabilities). (SafeGuard)

*   **World Management & Protection:** SjnExe parity goal.
    *   Investigate & Implement: Anti-Grief (e.g., auto-clear placed TNT by non-admins, auto-extinguish excessive fires not from natural sources).
    *   Investigate & Implement: Dimension Locks (prevent entry to Nether/End via configuration, with bypass for admins).

*   **Normal Player Panel Features (`!panel`):**

## Refactoring & Enhancements
*   **Refactor: Standardize Check Actions & Configurable Punishments:** Create a unified system for how checks trigger actions (flag, log, notify, command execution) and allow these actions/parameters to be configured per check (e.g., kick after N flags for 'fly'). (Scythe, SafeGuard)
*   **Comprehensive Coding Style Review:** Review all project script files (especially those not recently modified) for adherence to `Dev/CodingStyle.md` naming conventions (camelCase for variables, constants, functions; PascalCase for classes) and other style guidelines.

## Low Priority / Ideas

*   **Automated Actions (AutoMod):** (from original todo, Scythe, SafeGuard)
    *   Implement configurable automated actions (e.g., kick, temporary ban, extended watch period) based on accumulated flag counts or specific severe cheat detections. Requires careful design to minimize false positives and allow for admin review/override.
*   **Player Utilities & Experience:** SjnExe parity goal.
    *   Welcomer message for new players (optionally show their device type if API allows).
    *   Death Coords / Death Effects: Announce player death coordinates in chat (to player or party), possibly with cosmetic effects.
    *   Chat Formatting (potentially linked to the Rank System).
*   **Logging Enhancements:** SjnExe parity goal.
    *   **Admin Command Usage Logging:** Log when an admin uses an `!` command (especially AC related), what command, target (if any), and timestamp. (Store persistently or to console).
    *   **Detailed Player Join/Leave Logging:** Log player join/leave events with more context than default debug logs (e.g., IP if available via API - unlikely, device type).
*   **Performance Optimization:** (from original todo) Profile existing checks under load and optimize if necessary.
*   **Localization:** (from original todo) Consider options for localizing warning messages and UI elements for a multi-lingual audience.

## Public Info UI (`!ui`) Development
*   **Phase 1: My Stats & Info:**
    *   Command `!ui open mystats` (or just `!ui`).
    *   Displays the calling player's own flag counts, and basic AC rules/help.
*   **Phase 2: Server Info & Links:**
    *   Section for server rules (brief).
    *   Links to Discord/website (configurable).

## Documentation & Workflow
*   **Task File Maintenance:** AI assistant should keep `completed.md`, `ongoing.md`, and `todo.md` current.
