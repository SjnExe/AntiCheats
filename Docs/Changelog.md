# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-09-05

This is the second public release of AddonExe, introducing a wide range of features and a comprehensive command system to enhance server management and gameplay.

### Features

- **Slash Commands**: All commands are available as native slash commands (e.g., `/xhelp`, `/status`). Commands with potential vanilla conflicts are prefixed with `x`.
- **Rank System**: A comprehensive rank system with configurable permissions, chat formatting, and inheritance.
- **Economy System**: A basic economy with player balances, a `/pay` command, and an API for other features to use.
- **Punishment System**: Commands for banning, muting, and kicking players, with support for temporary and permanent durations.
- **Admin Panel**: A custom item (`exe:panel`) that opens a UI for server administration.
- **Player Data Management**: Robust system for tracking player data, including ranks, balances, homes, and more.
- **Home System**: Allows players to set and teleport to their own homes.
- **Teleportation System**: `/tpa` and `/tpahere` commands for players to request teleportation to each other.
- **Kit System**: Create kits of items that players can claim on a cooldown.
- **Report System**: A system for players to report issues and for admins to manage them.
- **Server Restart Manager**: A scheduled and manual server restart system with warnings.
- **Welcomer**: Automatically welcomes new players to the server.
- **Death Coordinates**: Notifies players of their coordinates upon death.
- **X-Ray Ore Notifications**: Alerts admins when players mine valuable ores.
- **Chat to Console**: Option to log all in-game chat to the server console.
- **Bounty System**: Place bounties on other players.
- **Vanish**: Allows admins to become invisible to other players.
- **Player Inventory Management**: Admins can view and copy player inventories.
- **Server Status**: A command to view server performance and player count.

### Commands

*Commands are run with a `/` prefix. For example: `/status`.*
*Some commands use an `x` prefix (e.g. `/xhelp`) to avoid conflicts with vanilla commands.*

#### General Commands

- `/xhelp`: Displays a list of available commands.
- `/rules`: Shows the server rules.
- `/spawn`: Teleports you to the world spawn.
- `/status`: Shows server status and player count.
- `/version`: Shows the addon version.
- `/report`: Reports a player.

#### Economy Commands

- `/balance`: Checks your balance.
- `/pay`: Pays another player.
- `/bounty`: Sets a bounty on a player.

#### Teleportation Commands

- `/home`: Teleports you to your home.
- `/sethome`: Sets your home location.
- `/delhome`: Deletes your home.
- `/tpa`: Requests to teleport to another player.
- `/tpaccept`: Accepts a teleport request.
- `/tpdeny`: Denies a teleport request.

#### Kit Commands

- `/kit`: Claims a kit.
- `/kits`: Lists available kits.

#### Admin Commands

- `/admin`: Provides access to admin functions.
- `/ban`: Bans a player.
- `/unban`: Unbans a player.
- `/mute`: Mutes a player.
- `/unmute`: Unmutes a player.
- `/kick`: Kicks a player.
- `/freeze`: Freezes a player in place.
- `/unfreeze`: Unfreezes a player.
- `/gamemode`: Changes a player's gamemode.
- `/clear`: Clears a player's inventory.
- `/clearchat`: Clears the chat for all players.
- `/invsee`: Views a player's inventory.
- `/copyinv`: Copies a player's inventory.
- `/vanish`: Toggles vanish mode.
- `/tp`: Teleports to a player.
- `/xreload`: Reloads the addon's configuration.
- `/save`: Saves all addon data.
- `/restart`: Initiates a server restart.
- `/ecwipe`: Wipes all economy data.
- `/setbalance`: Sets a player's balance.
- `/rank`: Manages player ranks.
- `/xraynotify`: Toggles X-ray notifications.
- `/deathcoords`: Toggles death coordinate messages.
- `/chattoconsole`: Toggles logging chat to the console.
- `/debug`: Toggles debug mode.
