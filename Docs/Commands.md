# AddonExe Commands

The default command prefix for this addon is `!` (this can be configured in `AddonExeBP/scripts/config.js`). All commands are entered via the standard Minecraft chat.

> [!NOTE]
> Angle brackets (`< >`) in command syntax denote required parameters.
> Square brackets (`[ ]`) denote optional parameters.
> Do not include the brackets themselves when using the commands.

Command permissions are based on a level system defined in `AddonExeBP/scripts/core/ranksConfig.js`. Common levels are:
- **Owner (0):** Highest permission for server owners.
- **Admin (1):** High-level administrative commands.
- **Member (1024):** Basic commands available to all players.

---

## Owner & Admin Commands

*(Permission Level 0-1)*

- **`!admin`**
  - **Syntax:** `!admin <reload|config|setrank>`
  - **Description:** Top-level admin command for configuration and reloads.
  - **Permission:** Owner
- **`!ban`** (Alias: `!b`)
  - **Syntax:** `!ban <playerName> [duration] [reason]`
  - **Description:** Bans a player. Duration e.g., `30m`, `2h`, `7d`, `perm`.
  - **Permission:** Admin
- **`!clear`**
  - **Syntax:** `!clear [playerName]`
  - **Description:** Clears your own inventory, or the inventory of another player.
  - **Permission:** Member (self), Admin (others)
- **`!clearchat`** (Alias: `!clrchat`)
  - **Syntax:** `!clearchat`
  - **Description:** Clears the global chat for all players.
  - **Permission:** Admin
- **`!clearreports`**
  - **Syntax:** `!clearreports`
  - **Description:** Clears all player-submitted reports.
  - **Permission:** Admin
- **`!copyinv`**
  - **Syntax:** `!copyinv <playerName>`
  - **Description:** Copies the inventory of another player.
  - **Permission:** Admin
- **`!debug`**
  - **Syntax:** `!debug <command> [args]`
  - **Description:** Provides access to debug tools and information.
  - **Permission:** Owner
- **`!freeze`** (Alias: `!frz`)
  - **Syntax:** `!freeze <playerName>`
  - **Description:** Freezes or unfreezes a player, preventing movement.
  - **Permission:** Admin
- **`!gamemode`** (Aliases: `!gmc`, `!gms`, `!gma`, `!gmsp`)
  - **Syntax:** `!gmc [playerName]`
  - **Description:** Sets a player's gamemode (Creative, Survival, Adventure, Spectator).
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
- **`!rank`**
  - **Syntax:** `!rank <get|set|remove> <playerName> [rank]`
  - **Description:** Manages player ranks.
  - **Permission:** Admin
- **`!reload`**
  - **Syntax:** `!reload`
  - **Description:** Reloads addon scripts. (Included in `!admin reload`).
  - **Permission:** Owner
- **`!reports`**
  - **Syntax:** `!reports [player|clear]`
  - **Description:** Manages player reports.
  - **Permission:** Admin
- **`!setbalance`**
  - **Syntax:** `!setbalance <playerName> <amount>`
  - **Description:** Sets a player's balance to a specific amount.
  - **Permission:** Admin
- **`!setspawn`**
  - **Syntax:** `!setspawn`
  - **Description:** Sets the world's default spawn point to your current location.
  - **Permission:** Admin
- **`!tp`**
  - **Syntax:** `!tp <playerName> [targetPlayer]`
  - **Description:** Teleports a player to another player or location.
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
  - **Syntax:** `!vanish`
  - **Description:** Toggles your visibility.
  - **Permission:** Admin
- **`!xraynotify`**
  - **Syntax:** `!xraynotify <on|off>`
  - **Description:** Toggles X-ray detection notifications for yourself.
  - **Permission:** Admin

---

## Member Commands (All Players)

*(Permission Level 1024)*

- **`!help`** (Alias: `!h`)
  - **Syntax:** `!help [commandName]`
  - **Description:** Shows available commands or help for a specific command.
- **`!kit`**
  - **Syntax:** `!kit [name]`
  - **Description:** Gives you a kit of items. If no name is provided, lists available kits.
- **`!panel`** (Alias: `!ui`)
  - **Syntax:** `!panel`
  - **Description:** Opens the main UI panel.
- **`!report`**
  - **Syntax:** `!report <playerName> <reason>`
  - **Description:** Reports a player for misconduct.
- **`!rules`** (Alias: `!r`)
  - **Syntax:** `!rules`
  - **Description:** Displays the server rules.
- **`!spawn`**
  - **Syntax:** `!spawn`
  - **Description:** Teleports you to the world spawn.
- **`!status`**
  - **Syntax:** `!status`
  - **Description:** Shows your current status (rank, money, etc.).
- **`!version`** (Alias: `!v`)
  - **Syntax:** `!version`
  - **Description:** Displays the current version of AddonExe.

### TPA System Commands
- **`!tpa <playerName>`**
  - **Description:** Sends a teleport request to another player.
- **`!tpahere <playerName>`**
  - **Description:** Requests another player to teleport to your location.
- **`!tpaccept`** (Alias: `!tpaa`)
  - **Description:** Accepts an incoming teleport request.
- **`!tpadeny`** (Alias: `!tpacancel`)
  - **Description:** Denies an incoming teleport request or cancels an outgoing one.

### Economy System Commands
- **`!balance`** (Alias: `!bal`)
  - **Description:** Shows your current balance.
- **`!baltop`**
  - **Description:** Shows the players with the highest balances.
- **`!pay <playerName> <amount>`**
  - **Description:** Pays another player from your balance.

### Bounty System Commands
- **`!bounty <playerName> <amount>`**
  - **Description:** Places a bounty on a player, making them a target.
- **`!listbounty`**
  - **Description:** Lists all players who currently have a bounty on them.
- **`!rbounty <playerName> <amount>`**
  - **Description:** Removes a portion of a bounty you have placed on a player.

### Homes System Commands
- **`!sethome <name>`**
- **`!home <name>`**
- **`!delhome <name>`**
- **`!homes`**

---
This list is based on the addon's current structure. For the most up-to-date information, use `!help` in-game. Command availability may depend on settings in `config.js`.
