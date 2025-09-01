# AddonExe: Features Overview

This document provides a detailed breakdown of the features available in AddonExe. For in-depth configuration of these features, please refer to the [Configuration Guide](ConfigurationGuide.md) and for command usage, see the [Commands List](Commands.md).

> [!NOTE]
> **This addon is currently a powerful moderation and server utility tool.**
> The comprehensive suite of cheat detections from the original addon is being rebuilt and will be added in a future update.

---

## I. Administrative & Server Management Systems

### A. Core Admin Tools

- **Universal UI Panel:** Accessible via `!panel` or `!ui`. The panel item can also be crafted by any player. It provides a graphical user interface whose content and available actions dynamically adapt based on user permissions.
  - **For Admins & Owners:**
    - **Enhanced Player Management:** Provides a list of online players, sorted by rank and name. Each player's name is clearly marked with `(Owner)`, `(Admin)`, and `(You)` suffixes for easy identification. Selecting a player opens a dedicated menu with a wide range of moderation actions like Kick, Ban, Mute, Freeze, Vanish, Inventory Management, and Teleportation.
  - **For Regular Players:** Shows user-specific info like personal stats, server rules, and useful links.
- **Comprehensive Text Commands:** A full suite of chat-based commands offers granular control over all features and administrative actions. (See [Commands List](Commands.md) for a complete reference).
- **Persistent Player Data:** Active mutes and bans are saved using Minecraft's dynamic properties, ensuring they persist across player sessions and server restarts.

### B. Flexible Rank System

- Define roles like Owner, Admin, and Member with specific permission levels.
- Permissions control access to commands and addon features.
- Customize visual chat prefixes/suffixes and nametag appearances for each rank.
- For configuration details, see the [Configuration Guide](ConfigurationGuide.md) and [Rank System Documentation](RankSystem.md).
  - *Key Configs: `config.js`, `ranksConfig.js`*

---

## II. Server Utility & Player Experience Features

### A. Teleport Request System (TPA/TPAHere)

- Allows players to request teleports to other players (`!tpa <playerName>`) or request others to teleport to them (`!tpahere <playerName>`).
- Features include:
  - Configurable request timeout periods.
  - Cooldowns between sending requests.
  - Teleport warmup period, during which movement or taking damage can cancel the teleport.
  - *Key Configs: `config.js` (under the `tpa` section)*

### B. Economy & Bounty System

- A simple economy system that allows players to have balances and transfer money.
- A full player-driven bounty system to place bounties on other players.
- **Commands:** `!balance`, `!pay`, `!baltop`, `!bounty`, `!listbounty`, `!rbounty`.
- **New Player Balance:** New players start with a configurable amount of money.
- *Key Configs: `config.js` (under the `economy` section)*

### C. Homes System

- Allows players to set a limited number of "homes" they can teleport back to.
- **Commands:** `!sethome`, `!home`, `!delhome`, `!homes`.
- **Max Homes:** The maximum number of homes a player can set is configurable.
- *Key Configs: `config.js` (under the `homes` section)*

### D. Kits System

- Allows players to claim predefined kits of items.
- **Commands:** `!kit`.
- **Cooldowns:** Kits can have cooldowns to prevent them from being claimed too frequently.
- **Customizable:** Kits are defined in `AddonExeBP/scripts/core/kitsConfig.js`.
- *Key Configs: `config.js` (under the `kits` section)*

### E. Player Information & Experience
- **Welcome Message:** Greet players with a customizable message when they join the server.
- **Death Coordinates:** Automatically send players their coordinates in chat when they die, so they can find their way back.
- **Server Rules Display:** Players can view server rules using the `!rules` command. The rules are defined as an array of strings in the configuration.
- *Key Configs: `config.js` (under the `playerInfo` and `serverInfo` sections)*

### F. Customizable Sound Events
- Customize sounds for specific in-game events to provide auditory feedback to players and admins.
- Events include:
  - Receiving a TPA request.
  - Receiving an admin notification.
  - Receiving a player warning.
  - Experiencing a command error.
- Sounds can be enabled/disabled and their sound ID, volume, and pitch can be configured.
- *Key Configs: `config.js` (under the `soundEvents` section)*

This overview covers the primary features. For specific configuration options and command usage, please refer to the linked detailed documentation within the `Docs` folder.
