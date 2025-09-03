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
  - **Chat Fallback:** `!admin`
- **/ban**
  - **Syntax:** `/ban <target: player> [duration: string] [reason: string]`
  - **Description:** Bans a player. Duration e.g., `30m`, `2h`, `7d`, `perm`.
  - **Permission:** Admin
  - **Chat Fallback:** `!ban`
- **/clear**
  - **Syntax:** `!clear [target: player]` (Chat-only)
  - **Description:** Clears your own inventory, or the inventory of another player.
  - **Permission:** Admin
- **/clearchat**
  - **Syntax:** `/clearchat`
  - **Permission:** Admin
  - **Chat Fallback:** `!clearchat`
- **/clearreports**
  - **Syntax:** `/clearreports`
  - **Description:** Clears all player-submitted reports.
  - **Permission:** Admin
  - **Chat Fallback:** `!clearreports`
- **/copyinv**
  - **Syntax:** `/copyinv <target: player>`
  - **Description:** Copies the inventory of another player.
  - **Permission:** Admin
  - **Chat Fallback:** `!copyinv`
- **/debug**
  - **Syntax:** `/debug <state: boolean>`
  - **Description:** Toggles the script debug logging mode.
  - **Permission:** Admin
  - **Chat Fallback:** `!debug`
- **/freeze**
  - **Syntax:** `/freeze <target: player> [state: "on" | "off"]`
  - **Description:** Freezes or unfreezes a player, preventing movement.
  - **Permission:** Admin
  - **Chat Fallback:** `!freeze`
- **/gma, /gmc, /gms, /gmsp**
  - **Syntax:** `!gma|gmc|gms|gmsp [target: player]` (Chat-only)
  - **Description:** Sets a player's gamemode (Adventure, Creative, Survival, Spectator).
  - **Permission:** Admin
- **/invsee**
  - **Syntax:** `/invsee <target: player> [page: int]`
  - **Description:** Views a player's inventory in chat.
  - **Permission:** Admin
- **/kick**
  - **Syntax:** `!kick <playerName> [reason]` (Chat-only)
  - **Description:** Kicks a player from the server.
  - **Permission:** Admin
- **/mute**
  - **Syntax:** `/mute <target: player> [duration: string] [reason: string]`
  - **Description:** Mutes a player. Duration e.g., `30m`, `1h`, `perm`.
  - **Permission:** Admin
  - **Chat Fallback:** `!mute`
- **/rank**
  - **Syntax:** `/rank <action: "set" | "remove"> <target: player> <rankId: string>`
  - **Description:** Manages custom, tag-based player ranks. Does not work for Owner/Admin/Member.
  - **Permission:** Admin
- **/xreload**
  - **Syntax:** `/xreload`
  - **Description:** Reloads the `ownerPlayerNames` from `config.js` and updates the owner's rank.
  - **Permission:** Admin
  - **Chat Fallback:** `!reload`
- **/restart**
  - **Syntax:** `/restart`
  - **Description:** Initiates the server restart sequence.
  - **Permission:** Admin
  - **Chat Fallback:** `!restart`
- **/reports**
  - **Syntax:** `/reports`
  - **Description:** Views the list of active reports via a UI panel.
  - **Permission:** Admin
- **/setbalance**
  - **Syntax:** `/setbalance <target: player> <amount: float>`
  - **Description:** Sets a player's balance to a specific amount.
  - **Permission:** Admin
  - **Chat Fallback:** `!setbalance`
- **/setspawn**
  - **Syntax:** `/setspawn`
  - **Description:** Sets the world's default spawn point to your current location.
  - **Permission:** Admin
- **/tp**
  - **Syntax:** `!tp <target> [destination]` (Chat-only)
  - **Description:** Teleports a player to another player or location.
  - **Permission:** Admin
- **/unban**
  - **Syntax:** `/unban <target: string>`
  - **Description:** Removes an active ban for a player.
  - **Permission:** Admin
- **/unmute**
  - **Syntax:** `/unmute <target: string>`
  - **Description:** Removes an active mute for a player.
  - **Permission:** Admin
- **/vanish**
  - **Syntax:** `/vanish`
  - **Description:** Toggles your visibility.
  - **Permission:** Admin
  - **Chat Fallback:** `!vanish`
- **/xraynotify**
  - **Syntax:** `/xraynotify`
  - **Description:** Toggles X-ray detection notifications for yourself.
  - **Permission:** Admin

---

## Member Commands (All Players)

*(Permission Level 1024)*

- **/xhelp**
  - **Syntax:** `/xhelp [commandName: string]`
  - **Description:** Shows available commands or help for a specific command.
  - **Chat Fallback:** `!help`, `!?`
- **/kit**
  - **Syntax:** `/kit [kitName: string]`
  - **Description:** Gives you a kit of items. If no name is provided, lists available kits.
  - **Chat Fallback:** `!kit`
- **/panel**
  - **Syntax:** `/panel`
  - **Description:** Opens the main UI panel.
  - **Chat Fallback:** `!panel`, `!ui`
- **/report**
  - **Syntax:** `/report <target: player> <reason: string>`
  - **Description:** Reports a player for misconduct.
  - **Chat Fallback:** `!report`
- **/rules**
  - **Syntax:** `/rules [ruleNumber: int]`
  - **Description:** Displays the server rules.
  - **Chat Fallback:** `!rules`
- **/spawn**
  - **Syntax:** `/spawn`
  - **Description:** Teleports you to the world spawn.
  - **Chat Fallback:** `!spawn`
- **/status**
  - **Syntax:** `/status`
  - **Description:** Shows the current server status.
  - **Chat Fallback:** `!status`
- **/version**
  - **Syntax:** `/version`
  - **Description:** Displays the current version of AddonExe.
  - **Chat Fallback:** `!version`

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
- **/tpadeny**
  - **Syntax:** `/tpadeny`
  - **Description:** Denies an incoming teleport request.
- **/tpacancel**
  - **Syntax:** `/tpacancel`
  - **Description:** Cancels an outgoing teleport request you have sent.
- **/tpastatus**
  - **Syntax:** `/tpastatus`
  - **Description:** Checks the status of your current incoming and outgoing TPA requests.

### Economy System Commands
- **/balance**
  - **Syntax:** `/balance [target: player]`
  - **Description:** Shows your or another player's current balance.
- **/baltop**
  - **Syntax:** `/baltop`
  - **Description:** Shows the players with the highest balances.
- **/pay**
  - **Syntax:** `/pay <target: player> <amount: float>`
  - **Description:** Pays another player from your balance. If the amount is large, it will require confirmation.
- **/payconfirm**
  - **Syntax:** `/payconfirm`
  - **Description:** Confirms a pending high-value payment requested with `/pay`.

### Bounty System Commands
- **/bounty**
  - **Syntax:** `/bounty <target: player> <amount: int>`
  - **Description:** Places a bounty on a player, making them a target.
- **/listbounty**
  - **Syntax:** `/listbounty [target: player]`
  - **Description:** Lists all active bounties or a specific player's bounty.
- **/removebounty**
  - **Syntax:** `/removebounty <amount: float> [target: player]`
  - **Description:** Removes a portion of a bounty from a player.

### Homes System Commands
- **/sethome**
  - **Syntax:** `/sethome [homeName: string]`
- **/home**
  - **Syntax:** `/home [homeName: string]`
- **/delhome**
  - **Syntax:** `/delhome <homeName: string>`
- **/homes**
  - **Syntax:** `/homes`

---
This list is based on the addon's current structure. For the most up-to-date information, use `/xhelp` in-game. Command availability may depend on settings in `config.js`.
