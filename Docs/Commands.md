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
  - **Description:** Bans a player. Also includes `/unban` and `/offlineban`.
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
  - **Description:** Mutes a player. Also includes `/unmute`. `duration` is a string like `30m`, `1h`. Defaults to `perm`. `reason` can be multiple words.
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
  - **Description:** Views the list of active reports via a UI panel. Also includes `/clearreports`.
  - **Permission:** Admin
  - **Aliases:** `/reportlist`

- **/setbalance**
  - **Syntax:** `/setbalance <target: player> <amount: float>`
  - **Description:** Sets a player's balance.
  - **Permission:** Admin
  - **Aliases:** `/setbal`

- **/tp**
  - **Syntax 1 (Player):** `!tp <targetPlayer> [destinationPlayer]`
  - **Syntax 2 (Coords):** `!tp [targetPlayer] <x> <y> <z>`
  - **Description:** Teleports a player to another player or to coordinates. Chat-only command.
  - **Permission:** Admin
  - **Aliases:** `!teleport`

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
  - **Description:** Reports a player for misconduct. Also includes `/reports` and `/clearreports` for admins.

- **/rules**
  - **Syntax:** `/rules [ruleNumber: int]`
  - **Description:** Displays the server rules.
  - **Aliases:** `/rule`

- **/status**
  - **Syntax:** `/status`
  - **Description:** Shows the current server status.
  - **Aliases:** `/info`

- **/version**
  - **Syntax:** `/version`
  - **Description:** Displays the current version of AddonExe.
  - **Aliases:** `/ver`

### Homes System
- **`/sethome <name>`:** Sets a home at your current location.
- **`/home [name]`:** Teleports you to a set home.
- **`/delhome <name>`:** Deletes a home.
- **`/homes`:** Lists all of your homes.

### TPA System
- **`/tpa <player>`:** Request to teleport to another player.
- **`/tpahere <player>`:** Request a player to teleport to you.
- **`/tpaccept`:** Accept an incoming teleport request.
- **`/tpadeny`:** Deny an incoming teleport request.
- **`/tpacancel`:** Cancel your outgoing teleport request.
- **`/tpastatus`:** Check the status of your TPA requests.

### Economy System
- **`/balance [player]`:** Shows your or another player's balance.
- **`/baltop`:** Shows the players with the highest balances.
- **`/pay <player> <amount>`:** Pays another player from your balance. Includes `/payconfirm`.

### Bounty System
- **`/bounty <player> <amount>`:** Places a bounty on a player.
- **`/listbounty [player]`:** Lists active bounties.
- **`/removebounty <amount> [player]`:** Removes a portion of a bounty from a player.

### Spawn System
- **`/spawn`:** Teleports you to the world spawn.
- **`/setspawn`:** Sets the world's default spawn point (Admin only).
