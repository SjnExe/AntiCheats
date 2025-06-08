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
*   [Automated Moderation (AutoMod)](#automated-moderation-automod)

## Features

*   **Comprehensive Cheat Detections:**
    *   **Movement:** Fly (sustained & hover), Speed, NoFall.
    *   **Combat:** Reach, CPS (Clicks Per Second / AutoClicker).
    *   **World:** Nuker (rapid block breaking), Illegal Item usage/placement.
    *   **Combat Log:** Flags players disconnecting shortly after PvP (disabled by default).
*   **Admin Tools:** Text-based commands and a UI (``!panel`` or ``!ui``) for admin actions and management.
*   **Configuration:** Adjust detection thresholds and features via ``AntiCheatsBP/scripts/config.js``.
*   **Data Persistence:** Player flags and violation data are saved and persist across server restarts and player sessions.
*   **Player Flagging System:** Players accumulate flags for violations, with notifications to admins.

## Required Experimental Toggles

To ensure this addon works correctly, you **must** enable the following experimental toggle(s) in your world settings:

*   **Beta APIs:** This toggle enables the ``@minecraft/server`` and ``@minecraft/server-ui`` scripting modules, essential for core functionality.

As new features are added, this list may be updated. Always check this README for the latest requirements.

## Setup

**Note:** This addon is designed for Minecraft Bedrock version 1.21.80 and newer.

1.  Apply both the Behavior Pack (``AntiCheatsBP``) and Resource Pack (``AntiCheatsRP``) to your world.
2.  Ensure the Behavior Pack is at the top of the pack list if multiple packs are applied.
3.  Enable the experimental toggles listed above.

## Admin Commands & UI

Administrators (players with the `admin` tag, configurable in ``AntiCheatsBP/scripts/config.js``) primarily manage the AntiCheat system through the Admin UI Panel:

### Admin UI (Recommended)

*   ``!panel`` (or ``!ui`` alias): Opens the main AntiCheat Admin Menu for player inspection, flag management, and monitoring. All text-based admin commands are also accessible via buttons and forms within this UI. For details on specific command functionalities available through the UI (like kick, mute, ban, inspect, resetflags, etc.), please refer to the `!help` command in-game which provides up-to-date information based on your permission level.

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

## Automated Moderation (AutoMod)

The AutoMod system is designed to automatically take action against players who repeatedly trigger cheat detections. It is highly configurable and aims to reduce the manual workload on administrators.

### How It Works
When a player triggers a specific cheat detection (e.g., for flying, speeding), they accumulate flags for that particular type of cheat (`checkType`). The AutoMod system monitors these flag counts. If a player's flag count for a `checkType` reaches a predefined threshold, AutoMod will execute a configured sequence of actions.

### Configuration
AutoMod is configured through two main files: `AntiCheatsBP/scripts/config.js` (for global settings) and `AntiCheatsBP/scripts/automodConfig.js` (for specific rules and messages).

#### 1. Global AutoMod Toggle
- **File:** `AntiCheatsBP/scripts/config.js`
- **Setting:** `enableAutoMod`
- **Usage:** Set to `true` to enable the entire AutoMod system, or `false` to disable it globally.
  ```javascript
  export const enableAutoMod = true; // or false
  ```

#### 2. Per-CheckType AutoMod Toggles
- **File:** `AntiCheatsBP/scripts/automodConfig.js`
- **Setting:** `automodPerCheckTypeToggles`
- **Usage:** This object allows you to enable or disable AutoMod for specific `checkType`s. If a `checkType` is not listed in this object, or if its value is `true`, AutoMod will be active for it (assuming the global `enableAutoMod` is also `true`). To disable AutoMod for a particular check, set its value to `false`.
  ```javascript
  export const automodPerCheckTypeToggles = {
    "fly_y_velocity": true,  // AutoMod enabled for this check
    "reach_combat": false, // AutoMod disabled for this check
    // ... other check types
  };
  ```

#### 3. AutoMod Rules (`automodRules`)
- **File:** `AntiCheatsBP/scripts/automodConfig.js`
- **Setting:** `automodRules`
- **Structure:** This is an object where each key is a `checkType` string (e.g., `"fly_y_velocity"`, `"nuker_break_speed"`). The value for each `checkType` is an array of `actionStep` objects, processed in order.
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
  "fly_y_velocity": [
    {
      "flagThreshold": 3,
      "actionType": "WARN",
      "parameters": { "reasonKey": "automod.fly.warn1" }
    },
    {
      "flagThreshold": 5,
      "actionType": "KICK",
      "parameters": { "reasonKey": "automod.fly.kick1" }
    },
    {
      "flagThreshold": 10,
      "actionType": "TEMP_BAN",
      "parameters": { "duration": "1h", "reasonKey": "automod.fly.tempban1" },
      "resetFlagsAfterAction": true
    }
  ],
  ```

#### 4. Supported Action Types (`actionType`)
The following `actionType` strings can be used in your `automodRules`:
- `FLAG_ONLY`: Takes no direct punitive action. Useful for sensitive checks or as an initial step. Logs that the rule was processed.
- `WARN`: Sends a configurable warning message to the player's chat.
- `KICK`: Kicks the player from the server with a configurable reason.
- `TEMP_BAN`: Temporarily bans the player for a configurable duration and reason. The player is also kicked.
- `PERM_BAN`: Permanently bans the player with a configurable reason. The player is also kicked.
- `MUTE`: Temporarily mutes the player for a configurable duration and reason. Player receives an in-game notification.
- `FREEZE`: Freezes the player (prevents movement). Player receives an in-game notification. This action is delegated to the `!freeze` command logic.
- `REMOVE_ILLEGAL_ITEM`: Removes all instances of a specific illegal item from the player's inventory. The item type is determined by the `violationDetails` of the flag that triggered this action.

#### 5. Action Messages (`automodActionMessages`)
- **File:** `AntiCheatsBP/scripts/automodConfig.js`
- **Setting:** `automodActionMessages`
- **Usage:** This is an object mapping `reasonKey` strings (used in `automodRules`) to the actual text messages that will be shown to players or used in logs. This allows for easy customization and potential localization of messages.
  ```javascript
  export const automodActionMessages = {
    "automod.fly.warn1": "Automated Warning: Unusual flight activity detected.",
    "automod.default.kick": "You have been kicked by AutoMod.",
    // ... other messages
  };
  ```

### Important Notes
- The AutoMod system processes rules based on escalating `flagThresholds` for each `checkType`.
- The `pData.automodState[checkType].lastActionThreshold` is used to prevent the same action from being repeatedly applied if the flag count hasn't increased beyond that threshold (unless flags are reset).
- All actions taken by AutoMod are logged in the Admin Action Logs (viewable via `!panel`) with "AutoMod" as the issuer.
- Administrators are also notified in chat when AutoMod takes a significant action.
