# AddonExe Commands

Commands in AddonExe are primarily run using slash commands (e.g., `/help`), which support autocomplete in-game. For convenience, most commands can also be run using a chat-based prefix, which defaults to `!` (e.g., `!help`).

> [!NOTE]
> - To use slash commands, you must **enable cheats** in your world settings.
> - For chat commands, arguments with spaces must be enclosed in `"double quotes"`.
> - Angle brackets `< >` denote required parameters. Square brackets `[ ]` denote optional parameters.

Command permissions are based on a level system defined in `AddonExeBP/scripts/core/ranksConfig.js`. Common levels are:
- **Owner (0):** Highest permission for server owners.
- **Admin (1):** High-level administrative commands.
- **Member (1024):** Basic commands available to all players.

---

## Owner & Admin Commands

*(Permission Level 0-1)*

- **/admin**
  - **Syntax:** `/admin <target: player> <action: "add" | "remove">`
  - **Description:** Adds or removes a player from the Admin rank.
  - **Permission:** Owner

- **/ban**
  - **Syntax:** `/ban <target: player> [duration: string] [reason: text]`
  - **Description:** Bans a player. `duration` is a string like `30m`, `2h`, `7d`. Defaults to `perm`. `reason` can be multiple words.
  - **Permission:** Admin

- **/clear**
  - **Syntax:** `!clear [target: player]` (Chat-only)
  - **Description:** Clears your own inventory, or the inventory of another player.
  - **Permission:** Admin
  - **Aliases:** `!ci`, `!clearinv`

- **/ecwipe**
  - **Syntax:** `!ecwipe [target: player]` (Chat-only)
  - **Description:** Clears a player's Ender Chest.
  - **Permission:** Admin
  - **Aliases:** `!clearec`, `!ecclear`

- **/clearchat**
  - **Syntax:** `/clearchat`
  - **Description:** Clears the chat for all players.
  - **Permission:** Admin
  - **Aliases:** `/cc`

- **/clearreports**
  - **Syntax:** `/clearreports`
  - **Description:** Clears all player-submitted reports.
  - **Permission:** Admin
  - **Aliases:** `/delreports`

- **/copyinv**
  - **Syntax:** `/copyinv <target: player>`
  - **Description:** Copies the inventory of another player.
  - **Permission:** Admin
  - **Aliases:** `/cloneinv`

- **/debug**
  - **Syntax:** `/debug [state: boolean]`
  - **Description:** Toggles the script debug logging mode.
  - **Permission:** Admin

- **/freeze**
  - **Syntax:** `/freeze <target: player>`
  - **Description:** Freezes or unfreezes a player.
  - **Permission:** Admin
  - **Aliases:** `/lock`

- **/gm**
  - **Syntax:** `/gm <gamemode> [target: player]`
  - **Description:** Sets a player's gamemode. Can use full names or shortcuts (`s`, `c`, `a`, `sp`).
  - **Permission:** Admin

- **/gms**
  - **Syntax:** `/gms [target: player]`
  - **Description:** Sets gamemode to Survival.
  - **Permission:** Admin
  - **Aliases:** `/s`, `/survival`

- **/gmc**
  - **Syntax:** `/gmc [target: player]`
  - **Description:** Sets gamemode to Creative.
  - **Permission:** Admin
  - **Aliases:** `/c`, `/creative`

- **/gma**
  - **Syntax:** `/gma [target: player]`
  - **Description:** Sets gamemode to Adventure.
  - **Permission:** Admin
  - **Aliases:** `/a`, `/adventure`

- **/gmsp**
  - **Syntax:** `/gmsp [target: player]`
  - **Description:** Sets gamemode to Spectator.
  - **Permission:** Admin
  - **Aliases:** `/sp`, `/spectator`

- **/invsee**
  - **Syntax:** `/invsee <target: player> [page: int]`
  - **Description:** Views a player's inventory in chat.
  - **Permission:** Admin
  - **Aliases:** `/seeinv`

- **/kick**
  - **Syntax:** `!kick <target: string> [reason: text]` (Chat-only)
  - **Description:** Kicks a player from the server. `reason` can be multiple words.
  - **Permission:** Admin
  - **Aliases:** `!boot`

- **/mute**
  - **Syntax:** `/mute <target: player> [duration: string] [reason: text]`
  - **Description:** Mutes a player. `duration` is a string like `30m`, `1h`. Defaults to `perm`. `reason` can be multiple words.
  - **Permission:** Admin
  - **Aliases:** `/silence`

- **/rank**
  - **Syntax:** `/rank <action: "set" | "remove"> <target: player> <rankId: string>`
  - **Description:** Manages custom, tag-based player ranks.
  - **Permission:** Admin

- **/reload**
  - **Syntax:** `/reload`
  - **Description:** Reloads the addon configuration from the config file.
  - **Permission:** Admin
  - **Aliases:** `/xreload`

- **/restart**
  - **Syntax:** `/restart`
  - **Description:** Initiates the server restart sequence.
  - **Permission:** Admin

- **/reports**
  - **Syntax:** `/reports`
  - **Description:** Views the list of active reports via a UI panel.
  - **Permission:** Admin
  - **Aliases:** `/reportlist`

- **/setbalance**
  - **Syntax:** `/setbalance <target: player> <amount: float>`
  - **Description:** Sets a player's balance.
  - **Permission:** Admin
  - **Aliases:** `/setbal`

- **/setspawn**
  - **Syntax:** `/setspawn`
  - **Description:** Sets the world's default spawn point to your current location.
  - **Permission:** Admin

- **/tp**
  - **Syntax 1 (Player):** `!tp <targetPlayer> [destinationPlayer]`
  - **Syntax 2 (Coords):** `!tp [targetPlayer] <x> <y> <z>`
  - **Description:** Teleports a player to another player or to coordinates. Chat-only command.
  - **Permission:** Admin
  - **Aliases:** `!teleport`

- **/unban**
  - **Syntax:** `/unban <target: string>`
  - **Description:** Unbans a player. The player can be offline.
  - **Permission:** Admin
  - **Aliases:** `/pardon`

- **/unmute**
  - **Syntax:** `/unmute <target: string>`
  - **Description:** Unmutes a player. The player can be offline.
  - **Permission:** Admin
  - **Aliases:** `/um`

- **/vanish**
  - **Syntax:** `/vanish`
  - **Description:** Toggles your visibility to other players.
  - **Permission:** Admin
  - **Aliases:** `/v`

- **/xraynotify**
  - **Syntax:** `/xraynotify`
  - **Description:** Toggles X-ray detection notifications for yourself.
  - **Permission:** Admin

---

## Member Commands (All Players)

*(Permission Level 1024)*

- **/help**
  - **Syntax:** `/help [commandName: string]`
  - **Description:** Shows available commands or help for a specific command.
  - **Aliases:** `/?`, `/cmds`, `/commands`

- **/kit**
  - **Syntax:** `/kit [kitName: string]`
  - **Description:** Gives you a kit of items. If no name is provided, lists available kits.
  - **Aliases:** `/kits`

- **/panel**
  - **Syntax:** `/panel`
  - **Description:** Opens the main UI panel.
  - **Aliases:** `/menu`

- **/report**
  - **Syntax:** `/report <target: player> <reason: text>`
  - **Description:** Reports a player for misconduct. `reason` can be multiple words.

- **/rules**
  - **Syntax:** `/rules [ruleNumber: int]`
  - **Description:** Displays the server rules.
  - **Aliases:** `/rule`

- **/spawn**
  - **Syntax:** `/spawn`
  - **Description:** Teleports you to the world spawn.
  - **Aliases:** `/lobby`, `/hub`

- **/status**
  - **Syntax:** `/status`
  - **Description:** Shows the current server status.
  - **Aliases:** `/info`

- **/version**
  - **Syntax:** `/version`
  - **Description:** Displays the current version of AddonExe.
  - **Aliases:** `/ver`

### TPA System Commands
- **/tpa**
  - **Syntax:** `/tpa <target: player>`
  - **Description:** Sends a teleport request to another player.

- **/tpahere**
  - **Syntax:** `/tpahere <target: player>`
  - **Description:** Requests another player to teleport to your location.

- **/tpaccept**
  - **Syntax:** `/tpaccept`
  - **Description:** Accepts an incoming teleport request.
  - **Aliases:** `/tpyes`

- **/tpadeny**
  - **Syntax:** `/tpadeny`
  - **Description:** Denies an incoming teleport request.
  - **Aliases:** `/tpno`

- **/tpacancel**
  - **Syntax:** `/tpacancel`
  - **Description:** Cancels an outgoing teleport request you have sent.

- **/tpastatus**
  - **Syntax:** `/tpastatus`
  - **Description:** Checks the status of your TPA requests.

### Economy System Commands
- **/balance**
  - **Syntax:** `/balance [target: player]`
  - **Description:** Shows your or another player's balance.
  - **Aliases:** `/bal`, `/money`

- **/baltop**
  - **Syntax:** `/baltop`
  - **Description:** Shows the players with the highest balances.
  - **Aliases:** `/topbal`, `/leaderboard`

- **/pay**
  - **Syntax:** `/pay <target: player> <amount: float>`
  - **Description:** Pays another player from your balance.

- **/payconfirm**
  - **Syntax:** `/payconfirm`
  - **Description:** Confirms a pending high-value payment.

### Bounty System Commands
- **/bounty**
  - **Syntax:** `/bounty <target: player> <amount: int>`
  - **Description:** Places a bounty on a player.

- **/listbounty**
  - **Syntax:** `/listbounty [target: player]`
  - **Description:** Lists active bounties.
  - **Aliases:** `/bounties`

- **/removebounty**
  - **Syntax:** `/removebounty <amount: float> [target: player]`
  - **Description:** Removes a portion of a bounty from a player.
  - **Aliases:** `/rbounty`

### Homes System Commands
- **/sethome**
  - **Syntax:** `/sethome <homeName: string>`
  - **Aliases:** `/addhome`
- **/home**
  - **Syntax:** `/home [homeName: string]`
- **/delhome**
  - **Syntax:** `/delhome <homeName: string>`
  - **Aliases:** `/remhome`
- **/homes**
  - **Syntax:** `/homes`
  - **Aliases:** `/listhomes`
