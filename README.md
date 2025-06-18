[![Minecraft BE Version](https://img.shields.io/badge/Minecraft_BE-1.21.90%2B-green)](https://www.minecraft.net/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/SjnExe/AntiCheats?style=flat-square)](https://github.com/SjnExe/AntiCheats/issues)

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

## Table of Contents
*   [🚀 Quick Start](#-quick-start)
*   [Core Features Overview](#core-features-overview)
*   [Installation](#installation)
*   [Basic Usage & Commands](#basic-usage--commands)
*   [Configuration Overview](#configuration-overview)
*   [Key Systems](#key-systems)
*   [Versioning](#versioning)
*   [Contributing](#contributing)

## Core Features Overview

This addon provides a suite of tools and detections to help maintain a fair gameplay environment:

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

## Installation

1.  **Download:** Obtain the addon pack (usually an `.mcaddon` file) from the [GitHub Releases page](https://github.com/placeholder_username/placeholder_repo/releases).
2.  **Apply Packs:** Apply both the Behavior Pack (`AntiCheatsBP`) and Resource Pack (`AntiCheatsRP`) to your Minecraft world.
3.  **Prioritize Behavior Pack:** Ensure the Behavior Pack is at the **top** of the behavior pack list if you have multiple packs active. This is crucial for compatibility.
4.  **Initial Configuration:** Follow step 4 in the [🚀 Quick Start](#-quick-start) section to set the `ownerPlayerName`. Also, ensure trusted admins have the appropriate `adminTag` (default: `"admin"`) as defined in `AntiCheatsBP/scripts/config.js`.

## Basic Usage & Commands

The default command prefix is `!` (configurable in `AntiCheatsBP/scripts/config.js`).
*   The primary way to interact with the addon as an admin is via the **`!panel`** (or `!ui`) command, which opens a comprehensive UI.
*   For a detailed list of all text-based commands for both administrators and players, including syntax and permissions, please refer to our complete [Commands Guide](Docs/Commands.md).

> [!TIP]
> You can quickly get help for any command by typing `!help <command_name>` in the chat if you know the command, or `!help` to list commands available to you.

## Configuration Overview

The main configuration for this addon is centralized in **[`AntiCheatsBP/scripts/config.js`](AntiCheatsBP/scripts/config.js)**. This file allows you to customize:
*   Core settings (command prefix, language, global feature toggles).
*   Cheat detection sensitivity and thresholds.
*   General behavior for systems like AutoMod and World Border.

While `config.js` is the primary hub, it may reference other specialized files for more detailed settings, such as [`AntiCheatsBP/scripts/core/actionProfiles.js`](AntiCheatsBP/scripts/core/actionProfiles.js) for defining specific detection responses.

> [!NOTE]
> Detailed setup and advanced configuration for complex systems like Automated Moderation and the World Border are found in their respective documentation files within the `Docs/` directory. Consult these for in-depth guidance.

## Key Systems

This addon includes several powerful systems that can be configured to your needs:

*   **Automated Moderation (AutoMod):**
    *   Automatically punishes players based on accumulated flags. Highly configurable.
    *   **Configure & Learn More:** [Docs/AutoModDetails.md](Docs/AutoModDetails.md)
*   **World Border System:**
    *   Define per-dimension playable areas with various customization options.
    *   **Configure & Learn More:** [Docs/WorldBorderDetails.md](Docs/WorldBorderDetails.md)
*   **Rank System:**
    *   Define Owner, Admin, and Member ranks with distinct visual tags.
    *   **Configure & Learn More:** [Docs/RankSystem.md](Docs/RankSystem.md)

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
