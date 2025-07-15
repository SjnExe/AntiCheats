# Addon Commands

The default command prefix for this addon is `!` (this can be configured in `AntiCheatsBP/scripts/config.js`). All commands are entered via the standard Minecraft chat.

> [!NOTE]
> Angle brackets (`< >`) in command syntax denote required parameters.
> Square brackets (`[ ]`) denote optional parameters.
> Do not include the brackets themselves when using the commands.

Command permissions are based on a level system, typically:
*   **Owner (0):** Highest permission, usually for server owner only.
*   **Admin (1):** High-level administrative commands.
*   **Moderator (2):** Mid-level moderation commands. (Note: This level might not be explicitly used by all commands; some may jump from Admin to Member).
*   **Member (Default: 1024):** Basic commands available to all players. The default permission level for members is `1024` as defined in `ranksConfig.js`.

Please verify the exact permission levels in `AntiCheatsBP/scripts/core/ranksConfig.js` and individual command definitions.

---

## Owner Commands
*(Typically Permission Level 0)*

*   **`!testnotify`** (Alias: `!tn`)
    *   **Syntax:** `!testnotify`
    *   **Description:** Sends a test admin notification to verify system functionality.
    *   **Permission:** Owner

---

## Admin Commands
*(Typically Permission Level 1)*

*   **`!ban`** (Alias: `!b`)
    *   **Syntax:** `!ban <playerName> [duration] [reason]`
    *   **Description:** Bans a player. Duration e.g., `30m`, `2h`, `7d`, `perm`.
    *   **Permission:** Admin
*   **`!clearchat`** (Alias: `!clrchat`)
    *   **Syntax:** `!clearchat`
    *   **Description:** Clears the global chat for all players.
    *   **Permission:** Admin
*   **`!clearreports`** (Alias: `!cr`)
    *   **Syntax:** `!clearreports <report_id|playerName|all>`
    *   **Description:** Clears player reports by ID, player name, or all reports.
    *   **Permission:** Admin
*   **`!copyinv`** (Alias: `!ci`)
    *   **Syntax:** `!copyinv <playerName>`
    *   **Description:** Copies another player's inventory to your own (requires confirmation).
    *   **Permission:** Admin
*   **`!endlock`** (Alias: `!el`)
    *   **Syntax:** `!endlock <on|off|status>`
    *   **Description:** Manages End dimension access lock.
    *   **Permission:** Admin
*   **`!freeze`** (Alias: `!frz`)
    *   **Syntax:** `!freeze <playerName> [on|off|toggle|status]`
    *   **Description:** Freezes or unfreezes a player, preventing movement.
    *   **Permission:** Admin
*   **`!gma`**
    *   **Syntax:** `!gma [playerName]`
    *   **Description:** Sets a player's gamemode to Adventure.
    *   **Permission:** Admin
*   **`!gmc`**
    *   **Syntax:** `!gmc [playerName]`
    *   **Description:** Sets a player's gamemode to Creative.
    *   **Permission:** Admin
*   **`!gms`**
    *   **Syntax:** `!gms [playerName]`
    *   **Description:** Sets a player's gamemode to Survival.
    *   **Permission:** Admin
*   **`!gmsp`**
    *   **Syntax:** `!gmsp [playerName]`
    *   **Description:** Sets a player's gamemode to Spectator.
    *   **Permission:** Admin
*   **`!inspect`** (Alias: `!i`)
    *   **Syntax:** `!inspect <playerName>`
    *   **Description:** Views a player's AntiCheat data, flags, and status.
    *   **Permission:** Admin
*   **`!invsee`** (Alias: `!is`)
    *   **Syntax:** `!invsee <playerName>`
    *   **Description:** Views a player's inventory through a UI.
    *   **Permission:** Admin
*   **`!kick`** (Alias: `!k`)
    *   **Syntax:** `!kick <playerName> [reason]`
    *   **Description:** Kicks a player from the server.
    *   **Permission:** Admin
*   **`!listwatched`** (Aliases: `!lsw`, `!lw`, `!watchedlist`)
    *   **Syntax:** `!listwatched`
    *   **Description:** Lists all online players currently being watched.
    *   **Permission:** Admin
*   **`!mute`** (Alias: `!m`)
    *   **Syntax:** `!mute <playerName> [duration] [reason]`
    *   **Description:** Mutes a player. Duration e.g., `30m`, `1h`, `perm`.
    *   **Permission:** Admin
*   **`!netherlock`** (Alias: `!nl`)
    *   **Syntax:** `!netherlock <on|off|status>`
    *   **Description:** Manages Nether dimension access lock.
    *   **Permission:** Admin
*   **`!notify`** (Aliases: `!notifications`, `!noti`)
    *   **Syntax:** `!notify [on|off|toggle|status]`
    *   **Description:** Manages your AntiCheat system notification preferences.
    *   **Permission:** Admin
*   **`!purgeflags`** (Alias: `!pf`)
    *   **Syntax:** `!purgeflags <playerName>`
    *   **Description:** Completely purges all flags, violation history, and AutoMod state for a player.
    *   **Permission:** Admin
*   **`!rank`**
    *   **Syntax:** `!rank <add|remove> <playerName> <rankId>`
    *   **Description:** Assigns or removes a manual rank from a player.
    *   **Permission:** Admin
*   **`!resetflags`** (Aliases: `!rf`, `!cw`, `!clearwarnings`)
    *   **Syntax:** `!resetflags <playerName>`
    *   **Description:** Clears a player's AntiCheat flags and violation data.
    *   **Permission:** Admin
*   **`!tp`**
    *   **Syntax:**
        *   `!tp <targetPlayer> [destinationPlayer]` - Teleport a player to another.
        *   `!tp <playerToMove> <x> <y> <z> [dimension]` - Teleport a player to coordinates.
    *   **Description:** Teleports a player to another player or to specific coordinates.
    *   **Permission:** Admin
*   **`!unban`** (Alias: `!ub`)
    *   **Syntax:** `!unban <playerName>`
    *   **Description:** Removes an active ban for a player.
    *   **Permission:** Admin
*   **`!unmute`** (Alias: `!um`)
    *   **Syntax:** `!unmute <playerName>`
    *   **Description:** Removes an active mute for a player.
    *   **Permission:** Admin
*   **`!vanish`** (Alias: `!vsh`)
    *   **Syntax:** `!vanish [silent|notify]`
    *   **Description:** Toggles your visibility and related effects (invisibility, no item pickup, etc.).
    *   **Permission:** Admin
*   **`!viewreports`** (Alias: `!vr`)
    *   **Syntax:** `!viewreports [report_id|playerName|all] [page_number]`
    *   **Description:** Views player-submitted reports. Supports filtering and pagination.
    *   **Permission:** Admin
*   **`!warnings`** (Alias: `!warns`)
    *   **Syntax:** `!warnings <playerName>`
    *   **Description:** Views a player's AntiCheat flags (similar to inspect).
    *   **Permission:** Admin
*   **`!watch`** (Alias: `!w`)
    *   **Syntax:** `!watch <playerName> [on|off|toggle]`
    *   **Description:** Manages watch status for a player. Toggles if no state [on|off] is specified.
    *   **Permission:** Admin
*   **`!worldborder`** (Aliases: `!wb`, `!worldb`)
    *   **Syntax:** `!worldborder <subcommand> [options...]` (Use `!wb help` for subcommands)
    *   **Description:** Manages per-dimension world borders (set, get, toggle, resize, etc.).
    *   **Permission:** Admin
*   **`!xraynotify`** (Alias: `!xn`)
    *   **Syntax:** `!xraynotify [on|off|status]`
    *   **Description:** Manages your X-Ray mining notification preferences.
    *   **Permission:** Admin

---

## Member Commands (All Players)
*(Typically Permission Level 1024 or as configured for the default rank)*

*   **`!help`** (Alias: `!h`)
    *   **Syntax:** `!help [commandName]`
    *   **Description:** Shows available commands or help for a specific command.
    *   **Permission:** Member
*   **`!listranks`** (Alias: `!lr`)
    *   **Syntax:** `!listranks`
    *   **Description:** Lists all defined ranks and their basic properties.
    *   **Permission:** Member
*   **`!myflags`** (Alias: `!mf`)
    *   **Syntax:** `!myflags`
    *   **Description:** Allows players to view their own AntiCheat flag status.
    *   **Permission:** Member
*   **`!panel`** (Alias: `!ui`)
    *   **Syntax:** `!panel`
    *   **Description:** Opens the main AntiCheat UI panel (content varies by permission; admin tools for staff, user info for regular players).
    *   **Permission:** Member
*   **`!report`** (Alias: `!rep`)
    *   **Syntax:** `!report <playerName> <reason...>`
    *   **Description:** Reports a player to administrators for review. Reason is mandatory.
    *   **Permission:** Member
*   **`!rules`** (Alias: `!r`)
    *   **Syntax:** `!rules`
    *   **Description:** Displays the server rules.
    *   **Permission:** Member
*   **`!version`** (Alias: `!v`)
    *   **Syntax:** `!version`
    *   **Description:** Displays the AntiCheat addon version.
    *   **Permission:** Member

### TPA System Commands
*(Available if `enableTpaSystem` is true in `config.js`)*

*   **`!tpa <playerName>`**
    *   **Syntax:** `!tpa <playerName>`
    *   **Description:** Sends a teleport request to another player.
    *   **Permission:** Member
*   **`!tpahere <playerName>`** (Alias: `!tph`)
    *   **Syntax:** `!tpahere <playerName>`
    *   **Description:** Requests another player to teleport to your location.
    *   **Permission:** Member
*   **`!tpaccept [playerName]`** (Alias: `!tpaa`)
    *   **Syntax:** `!tpaccept [playerName]`
    *   **Description:** Accepts an incoming teleport request. Specify player name if multiple requests are pending.
    *   **Permission:** Member
*   **`!tpacancel [playerName]`** (Aliases: `!tpc`, `!tpadeny`, `!tpcancel`)
    *   **Syntax:** `!tpacancel [playerName]`
    *   **Description:** Cancels your outgoing TPA request or denies an incoming one. If no player name is given, cancels/denies the most recent or relevant request.
    *   **Permission:** Member
*   **`!tpastatus`** (Alias: `!tps`)
    *   **Syntax:** `!tpastatus [on|off|status]`
    *   **Description:** Manages your TPA availability or checks current request status.
        *   `on`: Allow incoming TPA requests.
        *   `off`: Block incoming TPA requests (auto-declines pending).
        *   `status`: Shows if you are accepting TPA requests.
    *   **Permission:** Member

---

This list is based on the addon's structure and `config.js`. Some commands' availability or exact behavior might be further influenced by specific settings in `config.js` (e.g., `commandSettings` toggles). Always refer to in-game `!help` for the most context-aware command list.
