# AddonExe Commands

Commands in AddonExe are primarily run using slash commands (e.g., `/help`), which support autocomplete in-game. For convenience, most commands can also be run using a chat-based prefix, which defaults to `!` (e.g., `!help`).

> [!NOTE]
> - To use slash commands, you must **enable cheats** in your world settings.
> - For chat commands, arguments with spaces must be enclosed in `"double quotes"`.
> - Angle brackets `< >` denote required parameters. Square brackets `[ ]` denote optional parameters.

---

## Member Commands
Commands available to all players by default (Permission Level 1024).

### General
- **/help [command]**
  - Shows a list of available commands or help for a specific command.
  - *Aliases: `?`, `h`, `cmds`, `commands`*
- **/panel**
  - Opens the main UI panel.
  - *Aliases: `ui`, `menu`*
- **/rules [ruleNumber]**
  - Displays the server rules.
  - *Aliases: `rule`*
- **/status**
  - Displays the current server status, including online players and current tick.
- **/version**
  - Displays the current version of the addon.
  - *Aliases: `ver`*
- **/deathcoords**
  - Shows your last death coordinates.
  - *Aliases: `deathlocation`, `lastdeath`*
- **/spawn**
  - Teleports you to the world spawn.
  - *Aliases: `lobby`, `hub`*
- **/kit [kitName]**
  - Lists available kits or claims a specific kit.

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
  - *Aliases: `bal`, `money`*
- **/baltop**
  - Shows the players with the highest balances on the server.
  - *Aliases: `topbal`, `leaderboard`*
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
Commands available to Admins and above (Permission Level 1).

### Player Punishment
- **/ban <target> [duration] [reason]**
  - Bans a player. `duration` can be `30m`, `2h`, `7d`, etc.
- **/unban <target>**
  - Unbans a player.
- **/offlineban <target> [duration] [reason]**
  - Bans a player who is currently offline.
- **/kick <target> [reason]**
  - Kicks a player from the server. (Chat-only)
- **/mute <target> [duration] [reason]**
  - Mutes a player in chat.
- **/unmute <target>**
  - Unmutes a player.
- **/freeze <target>**
  - Freezes or unfreezes a player, preventing them from moving.

### Player Management
- **/invsee <target> [page]**
  - Views a player's inventory in chat.
- **/clear [target]**
  - Clears your own or another player's inventory. (Chat-only)
- **/ecwipe [target]**
  - Clears a player's Ender Chest. (Chat-only)
- **/copyinv <target>**
  - Copies the inventory of another player.
- **/vanish**
  - Toggles your visibility to other players.

### Server Moderation
- **/report <target>**
  - Reports a player for misconduct using a UI.
- **/reports**
  - Views the list of active reports via a UI panel.
- **/clearreports**
  - Clears all player-submitted reports.
- **/clearchat**
  - Clears the chat for all players.
- **/xraynotify**
  - Toggles X-ray detection notifications for yourself.

---

## Administration Commands
Commands for high-level server management, typically for Admins and Owners.

### Core Management
- **/admin <target> <add|remove>**
  - Adds or removes a player from the Admin rank. (Owner only)
- **/reload**
  - Reloads the addon configuration from `config.js`.
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
- **/tp <target> [destination]** or **!tp [target] <x> <y> <z>**
  - Teleports a player to another player or to coordinates. (Chat-only for coordinates)
- **/gamemode <mode> [target]**
  - Sets a player's gamemode.
- **/rank <set|remove> <target> <rankId>**
  - Manages custom player ranks.

### Utilities
- **/chattoconsole**
  - Toggles sending player chat messages to the console.
