# AddonExe Commands

Commands in AddonExe are primarily run using native slash commands, which support autocomplete in-game.

> [!NOTE]
> - To use slash commands, you must **enable cheats** in your world settings.
> - Some commands have an `x` prefix (e.g., `/xhelp`) to avoid conflicts with built-in Minecraft commands.
> - The `exe:` namespace can be used as a fallback for non-'x' commands if other addons have conflicting command names (e.g. `/exe:status`).
> - For convenience, most commands can also be run using a chat-based prefix, which defaults to `!` (e.g., `!help`). When using chat commands, arguments with spaces must be enclosed in `"double quotes"`.
> - Angle brackets `< >` denote required parameters. Square brackets `[ ]` denote optional parameters.

---

## Member Commands
Commands available to all players by default.

### General
- **/xhelp [command]**
  - Shows a list of available commands or help for a specific command.
  - *Chat Alias: `!help`*
- **/panel**
  - Opens the main UI panel.
  - *Chat Alias: `!panel`*
- **/rules [ruleNumber]**
  - Displays the server rules.
  - *Chat Alias: `!rules`*
- **/status**
  - Displays the current server status.
  - *Chat Alias: `!status`*
- **/version**
  - Displays the current version of the addon.
  - *Chat Alias: `!version`*
- **/deathcoords**
  - Shows your last death coordinates.
  - *Chat Alias: `!deathcoords`*
- **/spawn**
  - Teleports you to the world spawn.
  - *Chat Alias: `!spawn`*
- **/kit [kitName]**
  - Lists available kits or claims a specific kit.
  - *Chat Alias: `!kit`*

### TPA System
- **/tpa <target>**
  - Sends a teleport request to another player.
- **/tpahere <target>**
  - Requests another player to teleport to you.
- **/tpaccept**
  - Accepts an incoming teleport request.
- **/tpadeny**
  - Denies an incoming teleport request.
- **/tpacancel**
  - Cancels your outgoing teleport request.
- **/tpastatus**
  - Checks the status of your TPA requests.

### Home System
- **/sethome [homeName]**
  - Sets a home at your current location.
- **/home [homeName]**
  - Teleports you to a set home.
- **/delhome <homeName>**
  - Deletes a home.
- **/homes**
  - Lists all of your set homes.

### Economy System
- **/balance [target]**
  - Shows your or another player's balance.
- **/baltop**
  - Shows the players with the highest balances on the server.
- **/pay <target> <amount>**
  - Pays another player from your balance.
- **/payconfirm**
  - Confirms a pending high-value payment.

### Bounty System
- **/bounty <target> <amount>**
  - Places a bounty on a player.
- **/listbounty [target]**
  - Lists active bounties.
- **/removebounty <amount> [target]**
  - Removes a portion of a bounty from a player.

---

## Moderation Commands
Commands available to Admins and above.

### Player Punishment
- **/ban <target> [duration] [reason]**
  - Bans a player.
- **/unban <target>**
  - Unbans a player.
- **/offlineban <target> [duration] [reason]**
  - Bans a player who is currently offline.
- **/kick <target> [reason]**
  - Kicks a player from the server.
- **/mute <target> [duration] [reason]**
  - Mutes a player in chat.
- **/unmute <target>**
  - Unmutes a player.
- **/freeze <target>**
  - Freezes or unfreezes a player.

### Player Management
- **/invsee <target> [page]**
  - Views a player's inventory.
- **/clear [target]**
  - Clears another player's inventory.
- **/ecwipe [target]**
  - Clears a player's Ender Chest.
- **/copyinv <target>**
  - Copies the inventory of another player.
- **/vanish**
  - Toggles your visibility to other players.

### Server Moderation
- **/report <target>**
  - Reports a player for misconduct.
- **/reports**
  - Views the list of active reports.
- **/clearreports**
  - Clears all player-submitted reports.
- **/clearchat**
  - Clears the chat for all players.
- **/xraynotify**
  - Toggles X-ray detection notifications for yourself.

---

## Administration Commands
Commands for high-level server management.

### Core Management
- **/admin <target> <add|remove>**
  - Adds or removes a player from the Admin rank.
- **/xreload**
  - Reloads the addon configuration.
  - *Chat Alias: `!reload`*
- **/debug [true|false]**
  - Toggles the script debug logging mode.
- **/save**
  - Manually triggers the data saving process.
- **/restart**
  - Initiates the server restart sequence.

### Player & World
- **/setbalance <target> <amount>**
  - Sets a player's balance.
- **/setspawn [x] [y] [z]**
  - Sets the world's default spawn point.
- **/tp <target> [destination]**
  - Teleports a player.
- **/gamemode <mode> [target]**
  - Sets a player's gamemode.
- **/rank <set|remove> <target> <rankId>**
  - Manages custom player ranks.

### Utilities
- **/chattoconsole**
  - Toggles sending player chat messages to the console.
