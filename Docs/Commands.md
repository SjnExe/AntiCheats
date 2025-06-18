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
*   **`!version`**
    *   **Purpose:** Displays the current version of the AntiCheat addon.
    *   **Syntax:** `!version`
    *   **Permission:** Admin-only (typically, though sometimes available to all).

## Player Commands

These commands are generally available to all players on the server.

*   **`!help [command_name]`**
    *   **Purpose:** Shows available commands or help for a specific command.
    *   **Syntax:** `!help` or `!help <command_name>`
    *   **Permission:** All Players (shows commands relevant to the user's permission level).
*   **`!myflags`**
    *   **Purpose:** Allows a player to check their own current anti-cheat flag status.
    *   **Syntax:** `!myflags`
    *   **Permission:** All Players.
*   **`!uinfo`**
    *   **Purpose:** Displays a UI with the player's own anti-cheat stats, server rules, and help links.
    *   **Syntax:** `!uinfo`
    *   **Permission:** All Players.
*   **`!report <playername> <reason...>`**
    *   **Purpose:** Reports a player to administrators for review.
    *   **Syntax:** `!report <playername> <reason...>` (Reason is mandatory).
    *   **Permission:** All Players.
