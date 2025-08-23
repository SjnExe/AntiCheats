# Addon Commands

The default command prefix for this addon is `!` (this can be configured in `AntiCheatsBP/scripts/config.js`). All commands are entered via the standard Minecraft chat.

> [!NOTE]
> Angle brackets (`< >`) in command syntax denote required parameters.
> Square brackets (`[ ]`) denote optional parameters.
> Do not include the brackets themselves when using the commands.

Command permissions are based on a level system, typically:

- **Owner (0):** Highest permission, usually for server owner only.
- **Admin (1):** High-level administrative commands.
- **Moderator (2):** Mid-level moderation commands. (Note: This level might not be explicitly used by all commands; some may jump from Admin to Member).
- **Member (Default: 1024):** Basic commands available to all players. The default permission level for members is `1024` as defined in `ranksConfig.js`.

Please verify the exact permission levels in `AntiCheatsBP/scripts/core/ranksConfig.js` and individual command definitions.

---

## Admin Commands

*(Typically Permission Level 1)*

- **`!ban`** (Alias: `!b`)
  - **Syntax:** `!ban <playerName> [duration] [reason]`
  - **Description:** Bans a player. Duration e.g., `30m`, `2h`, `7d`, `perm`.
  - **Permission:** Admin
- **`!clear`**
  - **Syntax:** `!clear [playerName]`
  - **Description:** Clears your own inventory, or the inventory of another player (Admin only).
  - **Permission:** Member (self), Admin (others)
- **`!clearchat`** (Alias: `!clrchat`)
  - **Syntax:** `!clearchat`
  - **Description:** Clears the global chat for all players.
  - **Permission:** Admin
- **`!ecwipe`**
  - **Syntax:** `!ecwipe <playerName>`
  - **Description:** Clears the Ender Chest of the specified player.
  - **Permission:** Admin
- **`!freeze`** (Alias: `!frz`)
  - **Syntax:** `!freeze <playerName> [on|off|toggle|status]`
  - **Description:** Freezes or unfreezes a player, preventing movement.
  - **Permission:** Admin
- **`!gma`**
  - **Syntax:** `!gma [playerName]`
  - **Description:** Sets a player's gamemode to Adventure.
  - **Permission:** Admin
- **`!gmc`**
  - **Syntax:** `!gmc [playerName]`
  - **Description:** Sets a player's gamemode to Creative.
  - **Permission:** Admin
- **`!gms`**
  - **Syntax:** `!gms [playerName]`
  - **Description:** Sets a player's gamemode to Survival.
  - **Permission:** Admin
- **`!gmsp`**
  - **Syntax:** `!gmsp [playerName]`
  - **Description:** Sets a player's gamemode to Spectator.
  - **Permission:** Admin
- **`!invsee`** (Alias: `!is`)
  - **Syntax:** `!invsee <playerName>`
  - **Description:** Views a player's inventory through a UI.
  - **Permission:** Admin
- **`!kick`** (Alias: `!k`)
  - **Syntax:** `!kick <playerName> [reason]`
  - **Description:** Kicks a player from the server.
  - **Permission:** Admin
- **`!mute`** (Alias: `!m`)
  - **Syntax:** `!mute <playerName> [duration] [reason]`
  - **Description:** Mutes a player. Duration e.g., `30m`, `1h`, `perm`.
  - **Permission:** Admin
- **`!reload`**
  - **Syntax:** `!reload`
  - **Description:** Reloads all script files and functions in behavior packs. This is useful for development to apply script changes without restarting the world.
  - **Permission:** Admin
- **`!unban`** (Alias: `!ub`)
  - **Syntax:** `!unban <playerName>`
  - **Description:** Removes an active ban for a player.
  - **Permission:** Admin
- **`!unmute`** (Alias: `!um`)
  - **Syntax:** `!unmute <playerName>`
  - **Description:** Removes an active mute for a player.
  - **Permission:** Admin
- **`!vanish`** (Alias: `!vsh`)
  - **Syntax:** `!vanish [silent|notify]`
  - **Description:** Toggles your visibility and related effects (invisibility, no item pickup, etc.).
  - **Permission:** Admin

---

## Member Commands (All Players)

*(Typically Permission Level 1024 or as configured for the default rank)*

- **`!help`** (Alias: `!h`)
  - **Syntax:** `!help [commandName]`
  - **Description:** Shows available commands or help for a specific command.
  - **Permission:** Member
- **`!panel`** (Alias: `!ui`)
  - **Syntax:** `!panel`
  - **Description:** Opens the main AntiCheat UI panel (content varies by permission; admin tools for staff, user info for regular players).
  - **Permission:** Member
- **`!rules`** (Alias: `!r`)
  - **Syntax:** `!rules`
  - **Description:** Displays the server rules.
  - **Permission:** Member
- **`!version`** (Alias: `!v`)
  - **Syntax:** `!version`
  - **Description:** Displays the AntiCheat addon version.
  - **Permission:** Member

### TPA System Commands

*(Available if `enableTpaSystem` is true in `config.js`)*

- **`!tpa <playerName>`**
  - **Syntax:** `!tpa <playerName>`
  - **Description:** Sends a teleport request to another player.
  - **Permission:** Member
- **`!tpahere <playerName>`** (Alias: `!tph`)
  - **Syntax:** `!tpahere <playerName>`
  - **Description:** Requests another player to teleport to your location.
  - **Permission:** Member
- **`!tpaccept [playerName]`** (Alias: `!tpaa`)
  - **Syntax:** `!tpaccept [playerName]`
  - **Description:** Accepts an incoming teleport request. Specify player name if multiple requests are pending.
  - **Permission:** Member
- **`!tpacancel [playerName]`** (Aliases: `!tpc`, `!tpadeny`, `!tpcancel`)
  - **Syntax:** `!tpacancel [playerName]`
  - **Description:** Cancels your outgoing TPA request or denies an incoming one. If no player name is given, cancels/denies the most recent or relevant request.
  - **Permission:** Member

### Economy System Commands

*(Available if `economy.enabled` is true in `config.js`)*

- **`!balance`**
  - **Syntax:** `!balance`
  - **Description:** Shows your current balance.
  - **Permission:** Member
- **`!baltop`**
  - **Syntax:** `!baltop`
  - **Description:** Shows the players with the highest balances.
  - **Permission:** Member
- **`!pay <playerName> <amount>`**
  - **Syntax:** `!pay <playerName> <amount>`
  - **Description:** Pays another player a specific amount from your balance.
  - **Permission:** Member

### Homes System Commands

*(Available if `homes.enabled` is true in `config.js`)*

- **`!sethome <name>`**
  - **Syntax:** `!sethome <name>`
  - **Description:** Sets a home at your current location.
  - **Permission:** Member
- **`!home <name>`**
  - **Syntax:** `!home <name>`
  - **Description:** Teleports you to one of your saved homes.
  - **Permission:** Member
- **`!delhome <name>`**
  - **Syntax:** `!delhome <name>`
  - **Description:** Deletes one of your homes.
  - **Permission:** Member
- **`!homes`**
  - **Syntax:** `!homes`
  - **Description:** Lists all of your currently set homes.
  - **Permission:** Member

### Kit System Commands

*(Available if `kits.enabled` is true in `config.js`)*

- **`!kit [name]`**
  - **Syntax:** `!kit [name]`
  - **Description:** Gives you a kit of items. If no name is provided, lists available kits.
  - **Permission:** Member

---

This list is based on the addon's structure and `config.js`. Some commands' availability or exact behavior might be further influenced by specific settings in `config.js` (e.g., `commandSettings` toggles). Always refer to in-game `!help` for the most context-aware command list.
