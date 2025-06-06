# Anti-Cheats Addon

This addon uses advanced scripting capabilities to provide anti-cheat functionalities for Minecraft Bedrock Edition. It aims to detect and notify administrators of various common cheats.

## Table of Contents

*   [Features](#features)
*   [Required Experimental Toggles](#required-experimental-toggles)
*   [Setup](#setup)
*   [Admin Commands & UI](#admin-commands--ui)
*   [Configuration](#configuration)
*   [Versioning](#versioning)
*   [Owner and Rank System](#owner-and-rank-system)
*   [General Player Commands](#general-player-commands)
*   [Contributing](#contributing)

## Features

*   **Comprehensive Cheat Detections:**
    *   **Movement:** Fly (sustained & hover), Speed, NoFall.
    *   **Combat:** Reach, CPS (Clicks Per Second / AutoClicker).
    *   **World:** Nuker (rapid block breaking), Illegal Item usage/placement.
*   **Admin Tools:** Text-based commands and a UI (``!panel`` or ``!ui``) for admin actions and management.
*   **Configuration:** Adjust detection thresholds and features via ``AntiCheatsBP/scripts/config.js``.
*   **Data Persistence:** Player flags and violation data are saved and persist across server restarts and player sessions.
*   **Player Flagging System:** Players accumulate flags for violations, with notifications to admins.

## Required Experimental Toggles

To ensure this addon works correctly, you **must** enable the following experimental toggle(s) in your world settings:

*   **Beta APIs:** This toggle enables the ``@minecraft/server`` and ``@minecraft/server-ui`` scripting modules, essential for core functionality (may be named "Experimental Scripting Features" on some versions).

As new features are added, this list may be updated. Always check this README for the latest requirements.

## Setup

**Note:** This addon is designed for Minecraft Bedrock version 1.21.80 and newer.

1.  Apply both the Behavior Pack (``AntiCheatsBP``) and Resource Pack (``AntiCheatsRP``) to your world.
2.  Ensure the Behavior Pack is at the top of the pack list if multiple packs are applied.
3.  Enable the experimental toggles listed above.

## Admin Commands & UI

Administrators (players with the `admin` tag, configurable in ``AntiCheatsBP/scripts/config.js``) can manage the AntiCheat system:

### Admin UI (Recommended)

*   ``!panel`` (or ``!ui`` alias): Opens the main AntiCheat Admin Menu for player inspection, flag management, and monitoring.

### Text Commands

| Command                                           | Description                                                 |
| :------------------------------------------------ | :---------------------------------------------------------- |
| ``!version``                                      | Displays the current addon version.                         |
| ``!watch <playername>``                           | Toggles verbose debug logging for a player.                 |
| ``!inspect <playername>``                         | Shows a player's anti-cheat data summary in chat.           |
| ``!resetflags <playername>``                      | Resets all flags and violation data for a player.           |
| ``!xraynotify <on|off|status>``                  | Controls admin X-Ray ore mining notifications.              |
| ``!viewreports [playername|clearall|clear <id>]`` | Views and manages player reports.                           |
| ``!kick <playername> [reason]``                   | Kicks a player from the server.                             |

## Configuration

Fine-tune addon behavior by editing ``AntiCheatsBP/scripts/config.js``. Options include:
*   Enabling or disabling specific cheat detections.
*   Adjusting sensitivity thresholds for checks like speed, reach, CPS, etc.
*   Changing the admin tag.

Please refer to the comments within ``AntiCheatsBP/scripts/config.js`` for details on each option.

## Versioning

Note for contributors or those inspecting the source code: The version string displayed by ``!version`` (from ``AntiCheatsBP/scripts/config.js``) and used in the manifest file descriptions is managed by a placeholder ``v__VERSION_STRING__``. This placeholder is automatically replaced by the actual tagged version number during the automated GitHub release process.

## Owner and Rank System

The addon features a simple rank system to visually distinguish players. There are three ranks: Owner (highest), Admin, and Member (default).

*   **Owner Rank Configuration**:
    Set by defining the exact in-game name in the ``ownerPlayerName`` variable within ``AntiCheatsBP/scripts/config.js``.
    *Example:*
    ```javascript
    export const ownerPlayerName = "YourExactPlayerName";
    ```
    *Important*: If ``ownerPlayerName`` is not set, is empty, or remains as the placeholder ``"PlayerNameHere"``, the Owner rank will not be assigned.
*   **Admin Rank Configuration**: Determined by players having the ``adminTag`` (configurable in ``AntiCheatsBP/scripts/config.js``, default is "admin").

Ranks are displayed with distinct prefixes and colors in chat messages and above player nametags (e.g., Owner in red, Admin in aqua, Member in gray). To correctly configure the **Owner** rank, you **must** edit the ``ownerPlayerName`` as described.

## General Player Commands

These commands are available to all players.

*   ``!help [command_name]``: Shows available commands or help for a specific command.
*   ``!myflags``: Allows any player to check their own current flag status.
*   ``!uinfo``: Shows your anti-cheat stats, server rules, and help links in a UI.
*   ``!report <playername> <reason...>``: Reports a player for admin review. Reason is required.

## Contributing

We welcome contributions! Please follow these general guidelines:

1.  Fork the repository.
2.  Create a new branch (e.g., ``feature/your-feature`` or ``fix/issue-description``).
3.  Make your changes, adhering to existing code style and adding JSDoc comments.
4.  Update documentation if your changes affect usage or add features.
5.  Test your changes thoroughly.
6.  Create a pull request against the `main` branch with a clear description.

For more detailed development practices, task management, and workflow considerations, refer to the [Addon Development Resources in ``Dev/README.md``](Dev/README.md).
