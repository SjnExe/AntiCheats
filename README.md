# Anti-Cheats Addon

This addon uses advanced scripting capabilities to provide anti-cheat functionalities for Minecraft Bedrock Edition. It aims to detect and notify administrators of various common cheats.

## Table of Contents

*   [Features](#features)
*   [Setup](#setup)
*   [Admin Commands & UI](#admin-commands--ui)
*   [Configuration](#configuration)
*   [World Border System](#world-border-system)
*   [Versioning](#versioning)
*   [Owner and Rank System](#owner-and-rank-system)
*   [General Player Commands](#general-player-commands)
*   [Contributing](#contributing)
*   [Automated Moderation (AutoMod)](#automated-moderation-automod)

## Features

*   **Comprehensive Cheat Detections:**
    *   **Movement:** Fly (sustained, hover, high Y-velocity), Speed, NoFall.
    *   **Combat:** Reach, CPS (Clicks Per Second / AutoClicker).
    *   **World:** Nuker (rapid block breaking), Illegal Item usage/placement. Includes various other player behavior and world interaction checks (e.g., AntiGMC, NameSpoof, InstaBreak, Tower, AirPlace, FastUse, SelfHurt).
    *   **Nether Roof Detection**: Identifies players who access the top of the Nether (above a configurable Y-level). AutoMod is typically configured to kick players for this. Configurable via `enableNetherRoofCheck` and `netherRoofYLevelThreshold` in `config.js`.
    *   **Combat Log:** Flags players disconnecting shortly after PvP (disabled by default).
*   **Admin Tools:** Text-based commands and a UI (``!panel`` or ``!ui``) for admin actions and management.
*   **Configuration:** Adjust detection thresholds and features via ``AntiCheatsBP/scripts/config.js``.
*   **Data Persistence:** Player flags and violation data are saved and persist across server restarts and player sessions.
*   **Player Flagging System:** Players accumulate flags for violations, with notifications to admins.
*   **Automated Moderation (AutoMod):** System to automatically apply actions (warn, kick, ban, mute, etc.) based on configurable flag thresholds.
*   **Advanced World Border:** Per-dimension configurable borders (square/circle) with optional damage outside border, particle visuals, gradual resizing (including pause/resume capabilities), and safe player teleportation.

## Setup

**Note:** This addon is designed for Minecraft Bedrock version 1.21.90 and newer.

1.  Apply both the Behavior Pack (``AntiCheatsBP``) and Resource Pack (``AntiCheatsRP``) to your world.
2.  Ensure the Behavior Pack is at the top of the pack list if multiple packs are applied.

## Admin Commands & UI

Administrators (players with the `admin` tag, configurable in ``AntiCheatsBP/scripts/config.js``) primarily manage the AntiCheat system through the Admin UI Panel:

### Admin UI (Recommended)

*   ``!panel`` (or ``!ui`` alias): Opens the main AntiCheat Admin Menu for player inspection, flag management, and monitoring. All text-based admin commands are also accessible via buttons and forms within this UI. For details on specific command functionalities available through the UI (like kick, mute, ban, inspect, resetflags, etc.), please refer to the `!help` command in-game which provides up-to-date information based on your permission level. Key admin commands include `!worldborder` (or `!wb`) for managing per-dimension world borders. The `!help` command provides comprehensive details on all commands and subcommands available to your permission level.

## Configuration

All addon configuration is centralized in the **``AntiCheatsBP/scripts/config.js``** file. This single file is designed to be the primary place for server administrators to customize all aspects of the AntiCheat system.

Within `config.js`, you will find various sections to control:
*   Common settings like command prefix, default language, and feature toggles (e.g., welcomer, TPA, AntiGrief features).
*   Detection thresholds for various cheats.
*   Automated Moderation (AutoMod) behavior, including its global toggle.
*   Action profiles that define how the system reacts to cheat detections.
*   Default settings for features like the World Border system (e.g., particle types, damage defaults).
*   And other advanced system settings.

While `config.js` is the main configuration file, it may internally reference or load settings from other specialized modules for organization, such as:
*   **``AntiCheatsBP/scripts/core/actionProfiles.js``**: Defines detailed action sequences (e.g., flagging, notifications, punishments) triggered by cheat detections. These profiles are selected and configured within `config.js`.
*   **``AntiCheatsBP/scripts/core/automodConfig.js``**: Contains specific rules, messages, and per-check toggles for the Automated Moderation (AutoMod) system. Its overall behavior and enablement are managed via `config.js`.

Refer to the extensive comments within ``config.js`` for detailed explanations of each available option.

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

## World Border System

The addon includes a powerful World Border system to define playable areas per dimension.
Key features:
- **Per-Dimension Borders:** Configure unique borders for the Overworld, Nether, and The End.
- **Shapes:** Supports 'square' (center, half-size) and 'circle' (center, radius) borders.
- **Damage & Teleport:** Optionally configure damage for players outside the border, with eventual safe teleportation back.
- **Visuals:** Display configurable particle effects to indicate border proximity.
- **Gradual Resize:** Admin commands allow borders to shrink or expand over a defined time period.
- **Pause/Resume Resize:** Ongoing resizes can be paused and resumed.
- **Admin Control:** Manage all aspects via the `!worldborder` command (or `!wb`). Use `!wb help` for detailed subcommand information.
Default settings are in `config.js`, while active border configurations are stored in world dynamic properties.

## Contributing

We welcome contributions! Please follow these general guidelines:

1.  Fork the repository.
2.  Create a new branch (e.g., ``feature/your-feature`` or ``fix/issue-description``).
3.  Make your changes, adhering to existing code style and adding JSDoc comments.
4.  Update documentation if your changes affect usage or add features.
5.  Test your changes thoroughly.
6.  Create a pull request against the `main` branch with a clear description.

For more detailed development practices, task management, and workflow considerations, refer to the [Addon Development Resources in ``Dev/README.md``](Dev/README.md).

## Automated Moderation (AutoMod)

The AutoMod system is designed to automatically take action against players who repeatedly trigger cheat detections. It is highly configurable and aims to reduce the manual workload on administrators.

### How It Works
When a player triggers a specific cheat detection (e.g., for flying, speeding), they accumulate flags for that particular type of cheat (`checkType`). The AutoMod system monitors these flag counts. If a player's flag count for a `checkType` reaches a predefined threshold, AutoMod will execute a configured sequence of actions.

### Configuration
AutoMod is configured through **``AntiCheatsBP/scripts/config.js``** (for the global ``enableAutoMod`` toggle and overall settings) and primarily through **``AntiCheatsBP/scripts/core/automodConfig.js``** (for specific rules, messages, and per-check type toggles, which are then utilized by the main settings in `config.js`).

#### 1. Global AutoMod Toggle
- **File:** `AntiCheatsBP/scripts/config.js`
- **Setting:** Look for `enableAutoMod` (or a similarly named variable) within this file.
- **Usage:** Set to `true` to enable the entire AutoMod system, or `false` to disable it globally.
  ```javascript
  // Example structure within config.js
  export const someConfigObject = {
      // ... other settings
      enableAutoMod: true, // or false
      // ... other settings
  };
  ```

#### 2. Per-CheckType AutoMod Toggles
- **File:** `AntiCheatsBP/scripts/core/automodConfig.js`
- **Setting:** `automodPerCheckTypeToggles`
- **Usage:** This object allows you to enable or disable AutoMod for specific `checkType`s. If a `checkType` is not listed in this object, or if its value is `true`, AutoMod will be active for it (assuming the global `enableAutoMod` is also `true`). To disable AutoMod for a particular check, set its value to `false`.
  ```javascript
  export const automodPerCheckTypeToggles = {
    "movement_hover_fly": true,  // AutoMod enabled for this check
    "combat_cps_high": false, // AutoMod disabled for this check
    // ... other check types
  };
  ```

#### 3. AutoMod Rules (`automodRules`)
- **File:** `AntiCheatsBP/scripts/core/automodConfig.js`
- **Setting:** `automodRules`
- **Structure:** This is an object where each key is a `checkType` string (e.g., `"movement_hover_fly"`, `"nuker_break_speed"`). The value for each `checkType` is an array of `actionStep` objects, processed in order.
- **`actionStep` Object Properties:**
  - `flagThreshold` (number): The number of flags for this `checkType` at which this action step is triggered.
  - `actionType` (string): The type of action to take. See "Supported Action Types" below.
  - `parameters` (object): Action-specific parameters.
    - `reasonKey` (string): A key to look up the message/reason in `automodActionMessages`.
    - `duration` (string, optional): For actions like `TEMP_BAN` or `MUTE` (e.g., "30m", "1h", "7d").
    - *(Other parameters might be used by specific actions in the future).*
  - `resetFlagsAfterAction` (boolean, optional): If `true`, the flag count for this specific `checkType` will be reset to 0 after this action is performed. Defaults to `false`.

- **Example Rule:**
  ```javascript
  // In automodRules
  "movement_hover_fly": [
    {
      "flagThreshold": 3,
      "actionType": "warn",
      "parameters": { "reasonKey": "automod.fly.hover.warn1" }
    },
    {
      "flagThreshold": 5,
      "actionType": "kick",
      "parameters": { "reasonKey": "automod.fly.hover.kick1" }
    },
    {
      "flagThreshold": 10,
      "actionType": "tempBan",
      "parameters": { "duration": "1h", "reasonKey": "automod.fly.hover.tempban1" },
      "resetFlagsAfterAction": true
    }
  ],
  ```

#### 4. Supported Action Types (`actionType`)
The following `actionType` strings can be used in your `automodRules`:
- `flagOnly`: Takes no direct punitive action. Useful for sensitive checks or as an initial step. Logs that the rule was processed.
- `warn`: Sends a configurable warning message to the player's chat.
- `kick`: Kicks the player from the server with a configurable reason.
- `tempBan`: Temporarily bans the player for a configurable duration and reason. The player is also kicked.
- `permBan`: Permanently bans the player with a configurable reason. The player is also kicked.
- `mute`: Temporarily mutes the player for a configurable duration and reason. Player receives an in-game notification.
- `freeze`: Freezes the player (prevents movement). Player receives an in-game notification. This action is delegated to the `!freeze` command logic.
- `removeIllegalItem`: Removes all instances of a specific illegal item from the player's inventory. The item type is determined by the `violationDetails` of the flag that triggered this action.
- `teleportSafe`: Teleports the player to a safe location (e.g., inside a world border, or to specific coordinates defined in parameters). Behavior depends on context and parameters.

#### 5. Action Messages (`automodActionMessages`)
- **File:** `AntiCheatsBP/scripts/core/automodConfig.js`
- **Setting:** `automodActionMessages`
- **Usage:** This is an object mapping `reasonKey` strings (used in `automodRules`) to the actual text messages that will be shown to players or used in logs. This allows for easy customization and potential localization of messages.
  ```javascript
  export const automodActionMessages = {
    "automod.fly.hover.warn1": "Automated Warning: Unusual flight activity detected.", // Example updated
    "automod.default.kick": "You have been kicked by AutoMod.",
    // ... other messages
  };
  ```

### Important Notes
- The AutoMod system processes rules based on escalating `flagThresholds` for each `checkType`.
- The `pData.automodState[checkType].lastActionThreshold` is used to prevent the same action from being repeatedly applied if the flag count hasn't increased beyond that threshold (unless flags are reset).
- All actions taken by AutoMod are logged in the Admin Action Logs (viewable via `!panel`) with "AutoMod" as the issuer.
- Administrators are also notified in chat when AutoMod takes a significant action.
