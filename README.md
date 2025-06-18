[![Version](https://img.shields.io/badge/version-v__VERSION_STRING__-blue)](https://github.com/placeholder_username/placeholder_repo/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/placeholder_username/placeholder_repo?style=flat-square)](https://github.com/placeholder_username/placeholder_repo/issues)

# Anti-Cheats Addon

This addon utilizes advanced scripting capabilities to provide robust anti-cheat functionalities for Minecraft Bedrock Edition, aiming to detect and alert administrators to common cheating behaviors.

## 🚀 Quick Start

1.  **Download:** Get the latest version from the [GitHub Releases page](https://github.com/placeholder_username/placeholder_repo/releases). Look for the `.mcaddon` file.
2.  **Install:** Apply both the Behavior Pack (`AntiCheatsBP`) and Resource Pack (`AntiCheatsRP`) to your Minecraft world.
3.  **Prioritize:** Ensure the Behavior Pack is at the **top** of the pack list if you have multiple behavior packs active.
4.  **Explore:** Join your world and type `!panel` (or `!ui`) in chat to open the admin interface.
5.  **Configure (Optional):** Key settings like admin tags and command prefix are in `AntiCheatsBP/scripts/config.js`.

For more details, see the sections below.

## Table of Contents

*   [🚀 Quick Start](#-quick-start)
*   [Features](#features)
*   [Initial Configuration (Setup)](#initial-configuration-setup)
*   [Admin Commands & UI](#admin-commands--ui)
*   [Main Configuration File](#main-configuration-file)
*   [Automated Moderation (AutoMod)](#automated-moderation-automod)
*   [World Border System](#world-border-system)
*   [Owner and Rank System](#owner-and-rank-system)
*   [General Player Commands](#general-player-commands)
*   [Versioning](#versioning)
*   [Contributing](#contributing)

## Features

*   **Comprehensive Cheat Detections:**
    *   **Movement:** Fly (sustained, hover, high Y-velocity), Speed, NoFall.
    *   **Combat:** Reach, Clicks Per Second (CPS) / AutoClicker.
    *   **World Interaction:** Nuker (rapid block breaking), Illegal Item usage/placement, AntiGMC, NameSpoof, InstaBreak, Tower, AirPlace, FastUse, SelfHurt.
    *   **Exploits:** Nether Roof access, Combat Logging (disconnecting during PvP).
*   **Admin Tools:** User-friendly UI (`!panel`) and extensive text commands for player management and system control.
*   **Persistent Data:** Player flags and violation records are saved across sessions.
*   **Flagging System:** Players accumulate flags for suspected cheat violations, triggering admin notifications.
*   **Customizable Configuration:** Fine-tune detection sensitivity and toggle features via `AntiCheatsBP/scripts/config.js`.
*   **Automated Moderation (AutoMod):** Automatically issues warnings, kicks, or bans based on configurable flag thresholds. [Learn more in AutoMod Details](Docs/AutoModDetails.md).
*   **Advanced World Border:** Per-dimension, configurable square or circular borders with particle visuals, optional damage, and gradual resizing capabilities. [Explore World Border Details](Docs/WorldBorderDetails.md).

## Initial Configuration (Setup)

**Note:** This addon is designed for Minecraft Bedrock version `1.21.90` and newer. The "Quick Start" section covers the basic installation.

After installing the addon:
1.  **Set Permissions:**
    *   Assign the `admin` tag (or your configured `adminTag` from `config.js`) to trusted players who need administrative access.
    *   To designate a server owner with special privileges, set their exact in-game name in the `ownerPlayerName` field within `AntiCheatsBP/scripts/config.js`.

## Admin Commands & UI

Administrators (players with the `admin` tag) manage the system via the `!panel` UI or text commands. The default command prefix is `!` (configurable in `config.js`).

### Admin UI (Recommended)

*   `!panel` (or `!ui`): Opens the main AntiCheat Admin Menu, providing access to:
    *   Player inspection (flags, stats, inventory via `!invsee`).
    *   Flag management (view, reset via `!resetflags`).
    *   Applying punishments (`!kick`, `!mute`, `!ban`, `!tempban`, `!freeze`).
    *   World Border management (`!worldborder`).
    *   System status and logs.

### Essential Text Commands

*   `!help [command_name]`: Lists available commands or details for a specific command.
*   `!kick <playername> [reason]`: Kicks a player.
*   `!ban <playername> [reason]`: Permanently bans a player.
*   `!tempban <playername> <duration> [reason]`: Temporarily bans a player (e.g., `!tempban PlayerX 7d cheating`). Durations: `m` (minutes), `h` (hours), `d` (days).
*   `!mute <playername> <duration> [reason]`: Temporarily mutes a player.
*   `!unban <playername>` / `!unmute <playername>`: Manages bans/mutes.
*   `!freeze <playername>` / `!unfreeze <playername>`: Freezes/unfreezes a player.
*   `!inspect <playername>`: Shows detailed anti-cheat stats.
*   `!resetflags <playername> [checkType]`: Resets flags for a player.
*   `!worldborder` (or `!wb`): Manages world borders. Use `!wb help` for subcommands.
*   `!version`: Displays addon version.

For full command details, use `!help` in-game or the `!panel` UI. Angle brackets (`< >`) denote required parameters; square brackets (`[ ]`) denote optional ones. Do not include the brackets themselves when using the commands.

## Main Configuration File

Primary addon settings are in **[`AntiCheatsBP/scripts/config.js`](AntiCheatsBP/scripts/config.js)**. This central file allows administrators to customize:

*   Core settings (command prefix, language, global feature toggles).
*   Cheat detection sensitivity and thresholds.
*   AutoMod enablement and general behavior.
*   Default settings for systems like World Border.
*   Action profiles for cheat detection responses.

While `config.js` is the main hub, it uses other script files in `AntiCheatsBP/scripts/core/` for organization, such as:
*   [`AntiCheatsBP/scripts/core/actionProfiles.js`](AntiCheatsBP/scripts/core/actionProfiles.js): Details specific action sequences (flagging, notifications, punishments).
*   [`AntiCheatsBP/scripts/core/automodConfig.js`](AntiCheatsBP/scripts/core/automodConfig.js): Contains fine-grained rules and messages for AutoMod.

Consult the extensive comments within these files for detailed guidance on each option.

## Automated Moderation (AutoMod)

AutoMod automatically acts against players who repeatedly trigger cheat detections, based on flag counts and configurable rules.
*   **Control:** Enable/disable globally via `enableAutoMod` in `config.js`.
*   **Customization:** Define specific rules, actions (warn, kick, ban), and messages in `AntiCheatsBP/scripts/core/automodConfig.js`.
*   **Full Details:** For a comprehensive guide to AutoMod's mechanics and options, see [Docs/AutoModDetails.md](Docs/AutoModDetails.md).

## World Border System

Define playable areas per dimension with optional damage, particle indicators, and dynamic resizing.
*   **Management:** Control via `!worldborder` (or `!wb`) command and the `!panel` UI.
*   **In-Depth Guide:** For features, commands, and setup, refer to [Docs/WorldBorderDetails.md](Docs/WorldBorderDetails.md).

## Owner and Rank System

The addon includes a basic rank system: Owner, Admin, and Member, each with distinct visual tags in chat and above nametags.
*   **Owner Rank:** Configure by setting `ownerPlayerName` in `config.js` to the exact in-game name of the owner. If unset or left as default, this rank is not applied.
*   **Admin Rank:** Players with the `adminTag` (default: `"admin"`, set in `config.js`) receive this rank.

## General Player Commands

*   `!help [command_name]`: Shows available commands or help for a specific command.
*   `!myflags`: Allows players to check their own flag status.
*   `!uinfo`: Displays a UI with personal anti-cheat stats, server rules, and help links.
*   `!report <playername> <reason...>`: Reports a player for admin review (reason is mandatory).

## Versioning

The version string from `!version` (sourced from `config.js`) and in manifest files uses a `v__VERSION_STRING__` placeholder, automatically updated during GitHub releases.

## Contributing

We enthusiastically welcome contributions! Whether it's bug fixes, new features, or documentation improvements, your input is valuable.
1.  **Fork & Branch:** Fork the repository and create a new branch for your work.
2.  **Code Style:** Follow our [Coding Style Guide](Dev/CodingStyle.md). Comment your code clearly.
3.  **Test Thoroughly:** Ensure your changes work as expected and don't cause new issues.
4.  **Document Changes:** Update documentation if your changes impact usage or add features.
5.  **Pull Request:** Submit a PR to `main` with a clear description of your changes.

For more on development practices, see [Addon Development Resources in `Dev/README.md`](Dev/README.md). We appreciate your help!
