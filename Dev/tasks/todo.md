# To-Do / Future Tasks

This list contains planned features, improvements, and areas for future investigation. When a task is started, it should be moved to `Dev/tasks/ongoing.md`.

## High Priority / Next Up
*No high priority tasks currently identified.*

## Medium Priority

*   **Advanced Cheat Detections:**
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
        *   `!worldborder <get|set|remove> [params...]`: Manage a configurable world border (API dependent for enforcement).
        *   `!notify <on|off|toggle>`: Toggle admin notifications for themselves globally. (Scythe/SafeGuard)
    *   **UI Enhancements (Admin Panel Concept):** SjnExe parity goal.
        *   *(Existing: Base UI with Inspect, Reset Flags, List Watched)*
        *   Investigate: In-game config editor via UI (for `config.js` values).
        *   (Started) Admin Panel UI: View Ban/Mute Logs. (Warning logs are typically player flags, viewed differently).
        *   (Started) Integrate Player Inventory View (InvSee) into Admin Panel's player inspection UI.
    *   **System Features:** SjnExe parity goal.
        *   **Owner System:** Designate a single player (e.g., via `config.js` or first admin) as "Owner" with immutable admin rights and potentially exclusive commands. *(Core functionality implemented as part of Rank System via `ownerPlayerName` in `config.js`)*
        *   **Rank System:** Visual rank system with chat and nametag display. *(Core functionality IMPLEMENTED)*
            -   **Ranks & Criteria:** *(IMPLEMENTED: Owner, Admin, Member defined; Owner via `ownerPlayerName` in `config.js`, Admin via `adminTag`)*
            -   **Chat Display:** *(IMPLEMENTED: Rank prefix like `[Owner] PlayerName: message` with colors)*
            -   **Nametag Display:** *(IMPLEMENTED: Rank above player name like `Owner\nPlayerName` with colors. Nametag modification via `player.nameTag` was successful.)*
            -   Permissions for AC commands could be tied to ranks. *(Still to do)*
            -   Requires persistent storage if not solely derived from config/tags at runtime. *(Still relevant; current implementation is runtime derived from config/tags)*
        *   Investigate: Device Ban (highly API dependent, likely difficult/impossible with Script API alone, might involve external database if server has such capabilities). (SafeGuard)

*   **World Management & Protection:** SjnExe parity goal.
    *   Investigate & Implement: Anti-Grief (e.g., auto-clear placed TNT by non-admins, auto-extinguish excessive fires not from natural sources).
    *   Investigate & Implement: Dimension Locks (prevent entry to Nether/End via configuration, with bypass for admins).

*   **Normal Player Panel Features (`!panel`):**

## Refactoring & Enhancements
*   **Refactor `commandManager.js`**: Split commands into individual modules under a new `commands/` directory to improve organization and maintainability. `commandManager.js` will become a command loader and dispatcher.

## Low Priority / Ideas

*   **Automated Actions (AutoMod):** (from original todo, Scythe, SafeGuard)
    *   Implement configurable automated actions (e.g., kick, temporary ban, extended watch period) based on accumulated flag counts or specific severe cheat detections. Requires careful design to minimize false positives and allow for admin review/override.
*   **Player Utilities & Experience:** SjnExe parity goal.
    *   Welcomer message for new players (optionally show their device type if API allows).
    *   Death Coords / Death Effects: Announce player death coordinates in chat (to player or party), possibly with cosmetic effects.
    *   Chat Formatting (potentially linked to the Rank System).
*   **Fake Leave/Join Command (`!fakeleave`/`!fakejoin` or `!vanish` enhancement):**
    *   **Objective:** Allow admins to simulate leaving and rejoining the game.
    *   **Mechanics:**
        *   Combines current `!vanish` functionality (invisibility, hidden nametag).
        *   Broadcasts a server message: "§ePlayerName left the game." on activation, and "§ePlayerName joined the game." on deactivation.
        *   **Investigate:** Further methods to ensure the vanished player is hidden from player lists (tab menu) for other players as effectively as possible.
    *   **Considerations:** True removal from one's own tab list via server scripts is likely infeasible; focus on appearance to others.
*   **Logging Enhancements:** SjnExe parity goal.
    *   **Admin Command Usage Logging:** Log when an admin uses an `!` command (especially AC related), what command, target (if any), and timestamp. (Store persistently or to console).
    *   **Detailed Player Join/Leave Logging:** Log player join/leave events with more context than default debug logs (e.g., IP if available via API - unlikely, device type).
*   **Performance Optimization:** (from original todo) Profile existing checks under load and optimize if necessary.
*   **Localization:** (from original todo) Consider options for localizing warning messages and UI elements for a multi-lingual audience.

## Public Info UI (`!ui`) Development
*   **Phase 2: Server Info & Links:**
    *   Section for server rules (brief).
    *   Links to Discord/website (configurable).

## Documentation & Workflow
*   **Task File Maintenance:** AI assistant should keep `completed.md`, `ongoing.md`, and `todo.md` current.
