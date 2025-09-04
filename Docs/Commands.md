# AddonExe Commands

Commands in AddonExe are primarily run using slash commands (e.g., `/help`), which support autocomplete in-game. For convenience, most commands can also be run using a chat-based prefix, which defaults to `!` (e.g., `!help`). This prefix can be configured in `AddonExeBP/scripts/config.js`.

> [!NOTE]
> To use slash commands, you must **enable cheats** in your world settings.
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

- **/admin**
  - **Syntax:** `/admin <target: player> [action: "add" | "remove"]`
  - **Permission:** Owner
  - **Aliases:** `!admin`
- **/ban**
  - **Syntax:** `/ban <target: player> [duration: string] [reason: string]`
  - **Description:** Bans a player. Duration e.g., `30m`, `2h`, `7d`, `perm`.
  - **Permission:** Admin
  - **Aliases:** `!ban`
- **/clear**
  - **Syntax:** `!clear [target: player]` (Chat-only)
  - **Description:** Clears your own inventory, or the inventory of another player.
  - **Permission:** Admin
  - **Aliases:** `!ci`, `!clearinv`, `!clearinventory`
- **/clearchat**
  - **Syntax:** `/clearchat`
  - **Permission:** Admin
  - **Aliases:** `!clearchat`, `!cc`, `!clearscreen`
- **/clearreports**
  - **Syntax:** `/clearreports`
  - **Description:** Clears all player-submitted reports.
  - **Permission:** Admin
  - **Aliases:** `!clearreports`, `!delreports`
- **/copyinv**
  - **Syntax:** `/copyinv <target: player>`
  - **Description:** Copies the inventory of another player.
  - **Permission:** Admin
  - **Aliases:** `!copyinv`, `!cloneinv`
- **/debug**
  - **Syntax:** `/debug [state: boolean]`
  - **Description:** Toggles the script debug logging mode.
  - **Permission:** Admin
  - **Aliases:** `!debug`
- **/freeze**
  - **Syntax:** `/freeze <target: player> [state: "on" | "off"]`
  - **Description:** Freezes or unfreezes a player, preventing movement.
  - **Permission:** Admin
  - **Aliases:** `!freeze`, `!lock`
- **/gma, /gmc, /gms, /gmsp**
  - **Syntax:** `!gma|gmc|gms|gmsp [target: player]` (Chat-only)
  - **Description:** Sets a player's gamemode (Adventure, Creative, Survival, Spectator).
  - **Permission:** Admin
  - **Aliases:** `!a`, `!c`, `!s`, `!sp`
- **/invsee**
  - **Syntax:** `/invsee <target: player> [page: int]`
  - **Description:** Views a player's inventory in chat.
  - **Permission:** Admin
  - **Aliases:** `!invsee`, `!seeinv`, `!viewing`
- **/kick**
  - **Syntax:** `!kick <playerName> [reason]` (Chat-only)
  - **Description:** Kicks a player from the server.
  - **Permission:** Admin
  - **Aliases:** `!boot`
- **/mute**
  - **Syntax:** `/mute <target: player> [duration: string] [reason: string]`
  - **Description:** Mutes a player. Duration e.g., `30m`, `1h`, `perm`.
  - **Permission:** Admin
  - **Aliases:** `!mute`, `!silence`
- **/rank**
  - **Syntax:** `/rank <action: "set" | "remove"> <target: player> <rankId: string>`
  - **Description:** Manages custom, tag-based player ranks. Does not work for Owner/Admin/Member.
  - **Permission:** Admin
  - **Aliases:** `!rank`
- **/xreload**
  - **Syntax:** `/xreload`
  - **Description:** Reloads the addon configuration from the config file.
  - **Permission:** Admin
  - **Aliases:** `!reload`
- **/restart**
  - **Syntax:** `/restart`
  - **Description:** Initiates the server restart sequence.
  - **Permission:** Admin
  - **Aliases:** `!restart`
- **/reports**
  - **Syntax:** `/reports`
  - **Description:** Views the list of active reports via a UI panel.
  - **Permission:** Admin
  - **Aliases:** `!reports`, `!reportlist`, `!viewreports`
- **/setbalance**
  - **Syntax:** `/setbalance <target: player> <amount: float>`
  - **Description:** Sets a player's balance to a specific amount.
  - **Permission:** Admin
  - **Aliases:** `!setbalance`, `!setbal`, `!setmoney`
- **/setspawn**
  - **Syntax:** `/setspawn`
  - **Description:** Sets the world's default spawn point to your current location.
  - **Permission:** Admin
  - **Aliases:** `!setspawn`, `!addspawn`
- **/tp**
  - **Syntax:** `!tp <target> [destination]` (Chat-only)
  - **Description:** Teleports a player to another player or location.
  - **Permission:** Admin
  - **Aliases:** `!teleport`
- **/unban**
  - **Syntax:** `/unban <target: string>`
  - **Description:** Removes an active ban for a player.
  - **Permission:** Admin
  - **Aliases:** `!unban`, `!pardon`
- **/unmute**
  - **Syntax:** `/unmute <target: string>`
  - **Description:** Removes an active mute for a player.
  - **Permission:** Admin
  - **Aliases:** `!unmute`, `!unsilence`
- **/vanish**
  - **Syntax:** `/vanish`
  - **Description:** Toggles your visibility.
  - **Permission:** Admin
  - **Aliases:** `!vanish`, `!v`, `!hide`
- **/xraynotify**
  - **Syntax:** `/xraynotify`
  - **Description:** Toggles X-ray detection notifications for yourself.
  - **Permission:** Admin
  - **Aliases:** `!xraynotify`, `!xraynotifs`, `!xrayalerts`

---

## Member Commands (All Players)

*(Permission Level 1024)*

- **/xhelp**
  - **Syntax:** `/xhelp [commandName: string]`
  - **Description:** Shows available commands or help for a specific command.
  - **Aliases:** `!help`, `!?`, `!h`, `!cmds`, `!commands`
- **/kit**
  - **Syntax:** `/kit [kitName: string]`
  - **Description:** Gives you a kit of items. If no name is provided, lists available kits.
  - **Aliases:** `!kit`, `!kits`
- **/panel**
  - **Syntax:** `/panel`
  - **Description:** Opens the main UI panel.
  - **Aliases:** `!panel`, `!ui`, `!menu`
- **/report**
  - **Syntax:** `/report <target: player> <reason: string>`
  - **Description:** Reports a player for misconduct.
  - **Aliases:** `!report`
- **/rules**
  - **Syntax:** `/rules [ruleNumber: int]`
  - **Description:** Displays the server rules.
  - **Aliases:** `!rules`, `!rule`
- **/spawn**
  - **Syntax:** `/spawn`
  - **Description:** Teleports you to the world spawn.
  - **Aliases:** `!spawn`, `!lobby`, `!hub`
- **/status**
  - **Syntax:** `/status`
  - **Description:** Shows the current server status.
  - **Aliases:** `!status`, `!s`, `!stats`, `!info`
- **/version**
  - **Syntax:** `/version`
  - **Description:** Displays the current version of AddonExe.
  - **Aliases:** `!version`, `!ver`

### TPA System Commands
- **/tpa**
  - **Syntax:** `/tpa <target: player>`
  - **Description:** Sends a teleport request to another player.
  - **Aliases:** `!tpa`, `!tprequest`, `!asktp`, `!requesttp`
- **/tpahere**
  - **Syntax:** `/tpahere <target: player>`
  - **Description:** Requests another player to teleport to your location.
  - **Aliases:** `!tpahere`, `!asktphere`
- **/tpaccept**
  - **Syntax:** `/tpaccept`
  - **Description:** Accepts an incoming teleport request.
  - **Aliases:** `!tpaccept`, `!tpyes`, `!tpaaccept`
- **/tpadeny**
  - **Syntax:** `/tpadeny`
  - **Description:** Denies an incoming teleport request.
  - **Aliases:** `!tpadeny`, `!tpno`, `!tpadecline`
- **/tpacancel**
  - **Syntax:** `/tpacancel`
  - **Description:** Cancels an outgoing teleport request you have sent.
  - **Aliases:** `!tpacancel`, `!tpcancel`
- **/tpastatus**
  - **Syntax:** `/tpastatus`
  - **Description:** Checks the status of your current incoming and outgoing TPA requests.
  - **Aliases:** `!tpastatus`, `!tpstatus`

### Economy System Commands
- **/balance**
  - **Syntax:** `/balance [target: player]`
  - **Description:** Shows your or another player's current balance.
  - **Aliases:** `!balance`, `!bal`, `!money`, `!cash`, `!credits`
- **/baltop**
  - **Syntax:** `/baltop`
  - **Description:** Shows the players with the highest balances.
  - **Aliases:** `!baltop`, `!topbal`, `!leaderboard`, `!richlist`
- **/pay**
  - **Syntax:** `/pay <target: player> <amount: float>`
  - **Description:** Pays another player from your balance. If the amount is large, it will require confirmation.
  - **Aliases:** `!pay`, `!givemoney`, `!transfer`
- **/payconfirm**
  - **Syntax:** `/payconfirm`
  - **Description:** Confirms a pending high-value payment requested with `/pay`.
  - **Aliases:** `!payconfirm`, `!confirmpay`

### Bounty System Commands
- **/bounty**
  - **Syntax:** `/bounty <target: player> <amount: int>`
  - **Description:** Places a bounty on a player, making them a target.
  - **Aliases:** `!bounty`, `!setbounty`, `!addbounty`, `!+bounty`, `!abounty`
- **/listbounty**
  - **Syntax:** `/listbounty [target: player]`
  - **Description:** Lists all active bounties or a specific player's bounty.
  - **Aliases:** `!listbounty`, `!lbounty`, `!bounties`, `!bountylist`, `!showbounties`, `!hitlist`
- **/removebounty**
  - **Syntax:** `/removebounty <amount: float> [target: player]`
  - **Description:** Removes a portion of a bounty from a player.
  - **Aliases:** `!removebounty`, `!rbounty`, `!delbounty`, `!-bounty`

### Homes System Commands
- **/sethome**
  - **Syntax:** `/sethome [homeName: string]`
  - **Aliases:** `!sethome`, `!addhome`, `!+home`
- **/home**
  - **Syntax:** `/home [homeName: string]`
  - **Aliases:** `!home`
- **/delhome**
  - **Syntax:** `/delhome <homeName: string>`
  - **Aliases:** `!delhome`, `!remhome`, `!deletehome`, `!rmhome`, `!-home`
- **/homes**
  - **Syntax:** `/homes`
  - **Aliases:** `!homes`, `!listhomes`

---
This list is based on the addon's current structure. For the most up-to-date information, use `/xhelp` in-game. Command availability may depend on settings in `config.js`.
