# Addon Commands

The default command prefix for this addon is `!` (this can be configured in `AntiCheatsBP/scripts/config.js`). All commands are entered via the standard Minecraft chat.

> [!NOTE]
> Angle brackets (`< >`) in command syntax denote required parameters.
> Square brackets (`[ ]`) denote optional parameters.
> Do not include the brackets themselves when using the commands.

## Admin Commands

These commands are typically available to players with administrative privileges (e.g., those with the `admin` tag, as configured in `config.js`).

*   **`!panel`** (alias: `!ui`)
    *   **Purpose:** Opens the main AntiCheat Admin Menu UI.
    *   **Syntax:** `!panel`
    *   **Permission:** Admin-only.
*   **`!help [command_name]`**
    *   **Purpose:** Lists available commands or shows detailed help for a specific command.
    *   **Syntax:** `!help` or `!help <command_name>`
    *   **Permission:** Available to all, but shows commands based on permission level.
*   **`!kick <playername> [reason]`**
    *   **Purpose:** Kicks a player from the server.
    *   **Syntax:** `!kick <playername> [reason]`
    *   **Permission:** Admin-only.
*   **`!ban <playername> [reason]`**
    *   **Purpose:** Permanently bans a player from the server.
    *   **Syntax:** `!ban <playername> [reason]`
    *   **Permission:** Admin-only.
*   **`!tempban <playername> <duration> [reason]`**
    *   **Purpose:** Temporarily bans a player for a specified duration.
    *   **Syntax:** `!tempban <playername> <duration> [reason]` (e.g., `!tempban PlayerX 7d cheating`). Durations: `m` (minutes), `h` (hours), `d` (days).
    *   **Permission:** Admin-only.
*   **`!mute <playername> <duration> [reason]`**
    *   **Purpose:** Temporarily mutes a player for a specified duration.
    *   **Syntax:** `!mute <playername> <duration> [reason]`
    *   **Permission:** Admin-only.
*   **`!unban <playername>`**
    *   **Purpose:** Removes an active ban for a player.
    *   **Syntax:** `!unban <playername>`
    *   **Permission:** Admin-only.
*   **`!unmute <playername>`**
    *   **Purpose:** Removes an active mute for a player.
    *   **Syntax:** `!unmute <playername>`
    *   **Permission:** Admin-only.
*   **`!freeze <playername>`**
    *   **Purpose:** Freezes a player, preventing movement.
    *   **Syntax:** `!freeze <playername>`
    *   **Permission:** Admin-only.
*   **`!unfreeze <playername>`**
    *   **Purpose:** Unfreezes a player.
    *   **Syntax:** `!unfreeze <playername>`
    *   **Permission:** Admin-only.
*   **`!inspect <playername>`**
    *   **Purpose:** Shows detailed anti-cheat statistics and flag information for a player.
    *   **Syntax:** `!inspect <playername>`
    *   **Permission:** Admin-only.
*   **`!resetflags <playername> [checkType]`**
    *   **Purpose:** Resets all accumulated flags or flags for a specific `checkType` for a player.
    *   **Syntax:** `!resetflags <playername> [checkType]`
    *   **Permission:** Admin-only.
*   **`!worldborder`** (alias: `!wb`)
    *   **Purpose:** Manages per-dimension world borders.
    *   **Syntax:** `!worldborder <subcommand> [options...]` (Use `!wb help` for detailed subcommands)
    *   **Permission:** Admin-only.
*   **`!version`** (alias: `!v`)
    *   **Purpose:** Displays the current version of the AntiCheat addon.
    *   **Syntax:** `!version`
    *   **Permission:** All Players.
*   **`!clearchat`**
    *   **Purpose:** Clears the chat for all players.
    *   **Syntax:** `!clearchat`
    *   **Permission:** Admin-only.
*   **`!gmc <playername>`**
    *   **Purpose:** Sets a player's gamemode to Creative.
    *   **Syntax:** `!gmc <playername>`
    *   **Permission:** Admin-only.
*   **`!gms <playername>`**
    *   **Purpose:** Sets a player's gamemode to Survival.
    *   **Syntax:** `!gms <playername>`
    *   **Permission:** Admin-only.
*   **`!gma <playername>`**
    *   **Purpose:** Sets a player's gamemode to Adventure.
    *   **Syntax:** `!gma <playername>`
    *   **Permission:** Admin-only.
*   **`!gmsp <playername>`**
    *   **Purpose:** Sets a player's gamemode to Spectator.
    *   **Syntax:** `!gmsp <playername>`
    *   **Permission:** Admin-only.
*   **`!invsee <playername>`**
    *   **Purpose:** Allows viewing another player's inventory.
    *   **Syntax:** `!invsee <playername>`
    *   **Permission:** Admin-only.
*   **`!listwatched`** (alias: `!w`)
    *   **Purpose:** Lists all players currently being "watched" (e.g., for debug or detailed logging purposes).
    *   **Syntax:** `!listwatched`
    *   **Permission:** Admin-only.
*   **`!notify`** (alias: `!notifications`)
    *   **Purpose:** Toggles personal admin notifications for cheat detections.
    *   **Syntax:** `!notify`
    *   **Permission:** Admin-only.
*   **`!rules`**
    *   **Purpose:** Displays the server rules (as configured in `config.js`).
    *   **Syntax:** `!rules`
    *   **Permission:** All Players (typically, but listed as Admin command in `config.js` - check implementation if it needs to be moved).
*   **`!testnotify`**
    *   **Purpose:** Sends a test notification to yourself (for admins to test the notification system).
    *   **Syntax:** `!testnotify`
    *   **Permission:** Admin-only.
*   **`!tp <target_playername> [destination_playername]` OR `!tp <x> <y> <z> [target_playername]`**
    *   **Purpose:** Teleports a player to another player or to specific coordinates.
    *   **Syntax:** `!tp <target_playername> [destination_playername]` or `!tp <x> <y> <z> [target_playername]`
    *   **Permission:** Admin-only.
*   **`!vanish`**
    *   **Purpose:** Toggles visibility for an admin (vanish mode).
    *   **Syntax:** `!vanish`
    *   **Permission:** Admin-only.
*   **`!warnings [subcommand] [playername]`** (alias: `!cw` for `!warnings clear`)
    *   **Purpose:** Manages player warnings. Subcommands may include `show <playername>`, `clear <playername>`.
    *   **Syntax:** `!warnings <subcommand> [options...]`
    *   **Permission:** Admin-only.
*   **`!xraynotify`** (alias: `!xn`)
    *   **Purpose:** Toggles personal admin notifications for X-Ray ore mining alerts.
    *   **Syntax:** `!xraynotify`
    *   **Permission:** Admin-only.
*   **`!copyinv <playername>`**
    *   **Purpose:** Copies the inventory of the specified player to your own.
    *   **Syntax:** `!copyinv <playername>`
    *   **Permission:** Admin-only.
*   **`!netherlock`**
    *   **Purpose:** Toggles a lock on Nether portal usage.
    *   **Syntax:** `!netherlock`
    *   **Permission:** Admin-only.
*   **`!endlock`**
    *   **Purpose:** Toggles a lock on End portal usage.
    *   **Syntax:** `!endlock`
    *   **Permission:** Admin-only.

## Player Commands

These commands are generally available to all players on the server.

*   **`!help [command_name]`**
    *   **Purpose:** Shows available commands or help for a specific command.
    *   **Syntax:** `!help` or `!help <command_name>`
    *   **Permission:** All Players (shows commands relevant to the user's permission level).
*   **`!myflags`** (alias: `!mf`)
    *   **Purpose:** Allows a player to check their own current anti-cheat flag status.
    *   **Syntax:** `!myflags`
    *   **Permission:** All Players.
*   **`!uinfo`**
    *   **Purpose:** Displays a UI with the player's own anti-cheat stats, server rules, and help links.
    *   **Syntax:** `!uinfo`
    *   **Permission:** All Players.
*   **`!report <playername> <reason...>`**
    *   **Purpose:** Reports a player to administrators for review. (Note: Implementation may vary, e.g., through `reportManager.js` rather than a direct command file).
    *   **Syntax:** `!report <playername> <reason...>` (Reason is mandatory).
    *   **Permission:** All Players.
*   **`!rules`**
    *   **Purpose:** Displays the server rules. (Moved here as it's typically a player command)
    *   **Syntax:** `!rules`
    *   **Permission:** All Players.

## TPA Commands (Teleportation Request System)
These commands are available if the TPA system is enabled in `config.js` (`enableTPASystem`).
*   **`!tpa <playername>`**
    *   **Purpose:** Sends a teleport request to another player.
    *   **Syntax:** `!tpa <playername>`
    *   **Permission:** All Players.
*   **`!tpaccept [playername]`**
    *   **Purpose:** Accepts an incoming teleport request. If multiple requests are pending, specify which player's request to accept.
    *   **Syntax:** `!tpaccept [playername]`
    *   **Permission:** All Players.
*   **`!tpacancel`**
    *   **Purpose:** Cancels your outgoing teleport request or denies an incoming one.
    *   **Syntax:** `!tpacancel`
    *   **Permission:** All Players.
*   **`!tpahere <playername>`**
    *   **Purpose:** Requests another player to teleport to your location.
    *   **Syntax:** `!tpahere <playername>`
    *   **Permission:** All Players.
*   **`!tpastatus`**
    *   **Purpose:** Checks the status of your current TPA requests (incoming/outgoing).
    *   **Syntax:** `!tpastatus`
    *   **Permission:** All Players.
