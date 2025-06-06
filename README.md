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
*   [License](#license)

## Features

*   **Comprehensive Cheat Detections:**
    *   **Movement:** Fly (sustained & hover), Speed, NoFall.
    *   **Combat:** Reach, CPS (Clicks Per Second / AutoClicker).
    *   **World:** Nuker (rapid block breaking), Illegal Item usage/placement.
*   **Admin Tools:**
    *   Text-based commands for quick actions (see "[Admin Commands & UI](#admin-commands--ui)" section).
    *   A User Interface (``!panel`` or ``!ui`` alias) for easier management.
*   **Configuration:** Many detection thresholds and feature toggles can be adjusted via ``AntiCheatsBP/scripts/config.js``.
*   **Data Persistence:** Player flags and violation data are saved and persist across server restarts and player sessions.
*   **Player Flagging System:** Players accumulate flags for violations, with notifications to admins.

## Required Experimental Toggles

To ensure this addon works correctly, you **must** enable the following experimental toggle(s) in your world settings:

*   **Beta APIs:** This toggle enables the ``@minecraft/server`` and ``@minecraft/server-ui`` scripting modules, which are essential for the core functionality of this addon. Depending on your Minecraft version, this might also be named "Experimental Scripting Features" or similar.

As new features are added, this list may be updated with additional required toggles. Always check this README for the latest requirements.

## Setup

**Note:** This addon is designed for Minecraft Bedrock version 1.21.80 and newer.

1.  Apply both the Behavior Pack (``AntiCheatsBP``) and Resource Pack (``AntiCheatsRP``) to your world.
2.  Ensure the Behavior Pack is at the top of the pack list if multiple packs are applied.
3.  Enable the experimental toggles listed above.

## Admin Commands & UI

Administrators (players with the `admin` tag, configurable in ``AntiCheatsBP/scripts/config.js``) can manage the AntiCheat system using the following:

### Admin UI (Recommended)

*   ``!panel`` (or ``!ui`` alias): Opens the main AntiCheat Admin Menu.
    *   **Inspect Player Data**: View detailed anti-cheat stats for a player.
    *   **Reset Player Flags**: Clear all flags and violation data for a player.
    *   **List Watched Players**: See which players are currently being monitored with verbose logging.

### Text Commands

*   ``!version``: Displays the current AntiCheat addon version.
*   ``!watch <playername>``: Toggles verbose debug logging for the specified player. Useful for observing detection details.
*   ``!inspect <playername>``: Shows a summary of a player's current anti-cheat data (flags, watched status, etc.) in chat.
*   ``!resetflags <playername>``: Resets all flags and violation data for the specified player.
*   ``!xraynotify <on|off|status>``: Allows admins to control their X-Ray ore mining notifications.

## Configuration

The behavior of many checks can be fine-tuned by editing the ``AntiCheatsBP/scripts/config.js`` file. This includes:
*   Enabling or disabling specific cheat detections.
*   Adjusting sensitivity thresholds for checks like speed, reach, CPS, etc.
*   Changing the admin tag.

Please refer to the comments within ``AntiCheatsBP/scripts/config.js`` for details on each option.

## Versioning

Note for contributors or those inspecting the source code: The version string displayed by ``!version`` (from ``AntiCheatsBP/scripts/config.js``) and used in the manifest file descriptions is managed by a placeholder ``v__VERSION_STRING__``. This placeholder is automatically replaced by the actual tagged version number during the automated GitHub release process.

## Owner and Rank System

The addon features a simple rank system to visually distinguish players in chat and on their nametags. There are three ranks:

*   **Owner**: The highest rank, typically for the server owner.
    *   **Configuration**: Set by defining the exact in-game name in the ``ownerPlayerName`` variable within ``AntiCheatsBP/scripts/config.js``.
        *Example:*
        ```javascript
        export const ownerPlayerName = "YourExactPlayerName";
        ```
    *   **Important**: If ``ownerPlayerName`` is not set, is empty, or remains as the placeholder ``"PlayerNameHere"``, the Owner rank will not be assigned to anyone.
*   **Admin**: For server administrators and moderators.
    *   **Configuration**: Determined by players having a specific tag. This tag is defined by the ``adminTag`` variable in ``AntiCheatsBP/scripts/config.js`` (default is "admin").
*   **Member**: The default rank for all other players.

**Display Format:**

*   **Chat**: Messages are prefixed with the player's rank and name.
    *   Owner: `§c[Owner] §fPlayerName§f: message_content` (Red prefix, white name and message)
    *   Admin: `§b[Admin] §fPlayerName§f: message_content` (Aqua prefix, white name and message)
    *   Member: `§7[Member] §fPlayerName§f: message_content` (Gray prefix, white name and message)
*   **Nametags**: The rank is displayed above the player's name.
    *   Owner:
        ```
        §cOwner§f
        PlayerActualName
        ```
    *   Admin:
        ```
        §bAdmin§f
        PlayerActualName
        ```
    *   Member:
        ```
        §7Member§f
        PlayerActualName
        ```

To correctly configure the **Owner** rank, you **must** edit the ``ownerPlayerName`` in ``AntiCheatsBP/scripts/config.js`` to match the exact, case-sensitive in-game name of the project owner.

## General Player Commands

These commands are available to all players.

*   ``!help``: Shows a list of commands available to you based on your permissions.
*   ``!myflags``: Allows any player to check their own current flag status.

## Contributing

We welcome contributions to improve and expand this addon! If you'd like to contribute, please follow these general guidelines:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or bug fix (e.g., ``feature/your-feature-name`` or ``fix/issue-description``).
3.  **Make your changes.**
    *   Ensure your code adheres to the existing style found in the project.
    *   Add JSDoc comments for new functions and complex logic.
4.  **Add or update documentation** in the `README.md` or other relevant files if your changes affect usage, setup, or add new features.
5.  **Test your changes thoroughly** in-game to ensure they work as expected and don't introduce new issues.
6.  **Create a pull request** against the `main` branch of the original repository. Provide a clear description of your changes.

For more detailed development practices, information on our task management system, scripting language notes (currently plain JavaScript), and important workflow considerations (especially for AI-assisted development), please refer to the [Addon Development Resources in ``Dev/README.md``](Dev/README.md).

## License

This project is currently pending license information. Please check back later or contact the repository owner for details.
