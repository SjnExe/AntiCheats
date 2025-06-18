<!-- Optional: Add project logo/banner here -->
[![Minecraft BE Version](https://img.shields.io/badge/Minecraft_BE-1.21.90%2B-green)](https://www.minecraft.net/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/SjnExe/AntiCheats?style=flat-square)](https://github.com/SjnExe/AntiCheats/issues)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)](https://github.com/SjnExe/AntiCheats/pulse)
[![Maintained](https://img.shields.io/badge/Maintained%3F-Yes-brightgreen?style=flat-square)](https://github.com/SjnExe/AntiCheats/graphs/commit-activity)
<!-- [![Discord](https://img.shields.io/badge/Discord-Join_Chat-7289DA?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/YOUR_INVITE_CODE_HERE) -->

# Anti-Cheats Addon

This addon utilizes advanced scripting capabilities to provide robust anti-cheat functionalities for Minecraft Bedrock Edition, aiming to detect and alert administrators to common cheating behaviors.

## 🚀 Quick Start

1.  **Download:** Get the latest version from the [GitHub Releases page](https://github.com/placeholder_username/placeholder_repo/releases). Look for the `.mcaddon` file.
2.  **Install:** Apply both the Behavior Pack (`AntiCheatsBP`) and Resource Pack (`AntiCheatsRP`) to your Minecraft world.
3.  **Prioritize:** Ensure the Behavior Pack is at the **top** of the pack list if you have multiple behavior packs active.
4.  **Set Owner (Crucial):**
> [!IMPORTANT]
> Set your in-game name as `ownerPlayerName` in `AntiCheatsBP/scripts/config.js` to gain full owner permissions. This step is vital for full control over the addon.
5.  **Explore:** Join your world and type `!panel` (or `!ui`) in chat to open the admin interface.
6.  **Configure (Optional):** Other key settings like admin tags and command prefix are also in `AntiCheatsBP/scripts/config.js`.

For more details on specific systems, see the linked documentation pages.

## 📚 Table of Contents
*   [🚀 Quick Start](#-quick-start)
*   [✨ Core Features Overview](#-core-features-overview)
*   [🛠️ Initial Configuration (Setup)](#️-initial-configuration-setup)
*   [⚙️ Basic Usage & Commands](#️-basic-usage--commands)
*   [🔧 Main Configuration File](#️-main-configuration-file)
*   [🛡️ Automated Moderation (AutoMod)](#️-automated-moderation-automod)
*   [🗺️ World Border System](#️-world-border-system)
*   [🏅 Owner and Rank System](#️-owner-and-rank-system)
*   [📜 Versioning](#-versioning)
*   [🤝 Contributing](#-contributing)

## ✨ Core Features Overview

This addon provides a suite of tools and detections to help maintain a fair gameplay environment:

*   **🌍 Internationalization (i18n):** UI and messages adaptable for multiple languages. Default is English (`en_US`), with support for community translations. See `Docs/Internationalization.md`.
*   **Comprehensive Cheat Detections:** Identifies a wide range of cheats including:
    *   **Movement:** Fly, Speed, NoFall.
    *   **Combat:** Reach, CPS/AutoClicker.
    *   **World Interaction:** Nuker (rapid block breaking), Illegal Item usage/placement, `AntiGMC`, `NameSpoof`, `InstaBreak`, and various other player behavior checks.
    *   **Exploits:** Nether Roof access, Combat Logging.
*   **Admin Management Tools:** A user-friendly UI (`!panel`) and extensive text commands provide administrators with full control over players and system settings.
*   **Persistent Data & Flagging:** Player flags and violation records are saved across sessions, with notifications for administrators.
*   **Highly Customizable:** Fine-tune detection sensitivity, toggle features, and define automated actions.
*   **Automated Moderation (AutoMod):** Automatically issues warnings, kicks, or bans based on configurable flag thresholds. [Learn more in Docs/AutoModDetails.md](Docs/AutoModDetails.md).
*   **Advanced World Border:** Define per-dimension, configurable borders with visuals, damage, and resizing. [Explore Docs/WorldBorderDetails.md](Docs/WorldBorderDetails.md).
*   **Rank System:** Differentiate users with Owner, Admin, and Member ranks, configurable with visual tags. [Details in Docs/RankSystem.md](Docs/RankSystem.md).

## 🛠️ Initial Configuration (Setup)

**Note:** This addon is designed for Minecraft Bedrock version `1.21.90` and newer. The "Quick Start" section covers the basic installation.

After installing the addon:
1.  **Set Permissions:**
    *   Assign the `admin` tag (or your configured `adminTag` from `config.js`) to trusted players who need administrative access.
    *   To designate a server owner with special privileges, set their exact in-game name in the `ownerPlayerName` field within `AntiCheatsBP/scripts/config.js`.

## ⚙️ Basic Usage & Commands

The default command prefix is `!` (configurable in `AntiCheatsBP/scripts/config.js`).
*   The primary way to interact with the addon as an admin is via the **`!panel`** (or `!ui`) command, which opens a comprehensive UI.
*   For a detailed list of all text-based commands for both administrators and players, including syntax and permissions, please refer to our complete [Commands Guide](Docs/Commands.md).

> [!TIP]
> You can quickly get help for any command by typing `!help <command_name>` in the chat if you know the command, or `!help` to list commands available to you.

## 🔧 Main Configuration File

The main configuration for this addon is centralized in **[`AntiCheatsBP/scripts/config.js`](AntiCheatsBP/scripts/config.js)**. This file allows you to customize:
*   Core settings (command prefix, language, global feature toggles).
*   Cheat detection sensitivity and thresholds.
*   General behavior for systems like AutoMod and World Border.

While `config.js` is the primary hub, it may reference other specialized files for more detailed settings, such as [`AntiCheatsBP/scripts/core/actionProfiles.js`](AntiCheatsBP/scripts/core/actionProfiles.js) for defining specific detection responses.

> [!NOTE]
> Detailed setup and advanced configuration for complex systems like Automated Moderation and the World Border are found in their respective documentation files within the `Docs/` directory. Consult these for in-depth guidance.

## 🛡️ Automated Moderation (AutoMod)

Automatically punishes players based on accumulated flags. This system is highly configurable to suit your server's needs.
Key aspects include:
*   Global enable/disable via `config.js`.
*   Per-check type toggles and detailed rule definitions (flag thresholds, actions like warn/kick/ban, custom messages) in `AntiCheatsBP/scripts/core/automodConfig.js`.

For a comprehensive guide to AutoMod's mechanics, rule structure, action types, and all configuration options, please refer to [Docs/AutoModDetails.md](Docs/AutoModDetails.md).

## 🗺️ World Border System

Define and manage playable areas per dimension (Overworld, Nether, End) with this powerful system.
Features include:
*   Square or circular borders.
*   Optional damage for players outside the border.
*   Particle visuals to indicate border proximity.
*   Gradual resizing, including pause/resume capabilities.
*   Admin control via the `!worldborder` command (or `!wb`) and the `!panel` UI.

For a full guide on features, commands, and configuration, see [Docs/WorldBorderDetails.md](Docs/WorldBorderDetails.md).

## 🏅 Owner and Rank System

This addon includes a basic rank system to visually distinguish Owner, Admin, and Member roles, each potentially having different command access and chat/nametag visuals.
*   **Owner Rank:** Set via `ownerPlayerName` in `config.js`.
*   **Admin Rank:** Determined by the `adminTag` (also in `config.js`).

For detailed setup instructions, refer to [Docs/RankSystem.md](Docs/RankSystem.md).

## 📜 Versioning

The version string from `!version` (sourced from `config.js`) and in manifest files uses a `v__VERSION_STRING__` placeholder, automatically updated during GitHub releases.

## 🤝 Contributing

We enthusiastically welcome contributions! Whether it's bug fixes, new features, or documentation improvements, your input is valuable.
1.  **Fork & Branch:** Fork the repository and create a new branch for your work.
2.  **Code Style:** Follow our [Coding Style Guide](Dev/CodingStyle.md). Comment your code clearly.
3.  **Test Thoroughly:** Ensure your changes work as expected and don't cause new issues.
4.  **Document Changes:** Update documentation if your changes impact usage or add features.
5.  **Pull Request:** Submit a PR to `main` with a clear description of your changes.

For more on development practices, see [Addon Development Resources in `Dev/README.md`](Dev/README.md). We appreciate your help!
