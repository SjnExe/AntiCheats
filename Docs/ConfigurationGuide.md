# AntiCheats Addon: Configuration Guide

This guide provides an overview of how to configure the AntiCheats Addon for your Minecraft Bedrock Edition world. Proper configuration is key to tailoring the addon's behavior to your server's specific needs.

## 🛠️ Initial Setup & Permissions

These are the first crucial steps after installing the addon:

1.  **Set the Server Owner (Vital for Full Control):**
    *   **File:** `AntiCheatsBP/scripts/config.js`
    *   **Setting:** `ownerPlayerName`
    *   **Action:** Change the placeholder value of `ownerPlayerName` to your **exact** in-game Minecraft name (case-sensitive).
        ```javascript
        // Example in AntiCheatsBP/scripts/config.js
        export const ownerPlayerName = "YourExactPlayerName";
        ```
    *   **Importance:** The Owner rank has the highest level of permissions, including access to sensitive configurations and commands. Without setting this correctly, you may not have full control over the addon.

2.  **Assign Admin Permissions:**
    *   **File:** `AntiCheatsBP/scripts/config.js`
    *   **Setting:** `adminTag`
    *   **Action:** This variable defines the Minecraft tag that grants players administrative privileges within the AntiCheat system (e.g., access to `!panel`, moderation commands). The default is usually `"admin"`.
        ```javascript
        // Example in AntiCheatsBP/scripts/config.js
        export const adminTag = "admin";
        ```
    *   **Usage:** To make a player an admin, use Minecraft's built-in `/tag` command:
        `/tag "PlayerName" add admin` (or whatever tag you've set in `adminTag`).

For more details on how ranks and permissions work, see the [Rank System Guide](RankSystem.md).

## 🔧 Main Configuration Hub: `config.js`

The primary configuration file for the AntiCheats Addon is:
**`AntiCheatsBP/scripts/config.js`**

This file is extensively commented and allows you to customize a wide range of settings, including but not limited to:

*   **Core System Settings:**
    *   `prefix`: The chat command prefix (default: `!`).
    *   `enableDebugLogging`: Toggle for detailed console logs, useful for troubleshooting.
    *   Global toggles for major features like `enableAutoMod`, `enableTpaSystem`, `enableWorldBorderSystem`, etc.
*   **Cheat Detection Parameters:**
    *   Enable/disable individual cheat checks (e.g., `enableFlyCheck`, `enableReachCheck`).
    *   Adjust sensitivity, thresholds, and specific conditions for many detections (e.g., `maxCpsThreshold`, `reachDistanceSurvival`, `flySustainedVerticalSpeedThreshold`).
*   **Behavioral Settings:**
    *   Messages for welcomer, death coordinates, etc.
    *   Default settings for features like World Border damage or AutoMod mute durations.
*   **Command Aliases:**
    *   `commandAliases`: Define short aliases for longer commands.
*   **Individual Command Toggles:**
    *   `commandSettings`: An object to enable or disable specific commands individually.

**Structure of `config.js`:**
The `config.js` file primarily exports constants. Many ofthese are grouped into an `editableConfigValues` object. This special object allows some (but not all) configuration values to be modified at runtime by the server Owner via the `!panel` UI or potentially a dedicated `!acconfig` command (if implemented).

> [!IMPORTANT]
> Always make a backup of `config.js` before making significant changes. Incorrectly modifying this file can lead to errors or unexpected behavior.

## 📄 Specialized Configuration Files

While `config.js` is the central hub, some complex systems have their detailed rule-sets in dedicated files within the `AntiCheatsBP/scripts/core/` directory. These are then typically imported or referenced by `config.js` or other core manager scripts.

*   **Action Profiles (`actionProfiles.js`):**
    *   **File:** `AntiCheatsBP/scripts/core/actionProfiles.js`
    *   **Purpose:** Defines what happens when a specific cheat detection (`checkType`) is triggered. This includes whether to flag the player, how many flags to add, the reason message, whether to notify admins, and if the action should be logged.
    *   **Linkage:** The `checkType` string used in these profiles (e.g., `movementFlyHover`) is what links a detection in a check script (like `flyCheck.js`) to its consequences.

*   **AutoMod Configuration (`automodConfig.js`):**
    *   **File:** `AntiCheatsBP/scripts/core/automodConfig.js`
    *   **Purpose:** Contains the rules for the Automated Moderation system. This includes:
        *   `automodRules`: Defines flag thresholds for specific `checkTypes` and the corresponding actions (warn, kick, ban, mute) to take, along with message templates.
        *   `automodPerCheckTypeToggles`: Allows enabling or disabling AutoMod for individual cheat detections.
    *   **Details:** For an in-depth explanation, see [AutoMod Details](AutoModDetails.md).

*   **Rank Definitions (`ranksConfig.js`):**
    *   **File:** `AntiCheatsBP/scripts/core/ranksConfig.js`
    *   **Purpose:** Defines the available ranks (Owner, Admin, Member, etc.), their permission levels, chat formatting, and conditions for assignment.
    *   **Details:** See [Rank System Guide](RankSystem.md).

*   **Text Database (`textDatabase.js`):**
    *   **File:** `AntiCheatsBP/scripts/core/textDatabase.js`
    *   **Purpose:** A simple key-value store for most user-facing UI text and command response messages. This allows for easier text management and potential future localization. The `playerUtils.getString(key, params)` function is used to retrieve and format these strings.

## Best Practices for Configuration

*   **Read Comments:** `config.js` and other configuration files are usually well-commented. Read these comments carefully before changing values.
*   **Start Small:** If you're unsure about a setting, change it by a small amount and observe the effect on your server.
*   **Test Thoroughly:** After making configuration changes, test them to ensure they work as expected and don't cause false positives or unwanted side effects.
*   **Backup:** Before major changes, always back up your `config.js` and other relevant configuration files.
*   **Consult Documentation:** For complex systems like AutoMod or World Border, refer to their specific detailed guides in the `Docs/` folder.

By understanding these configuration files and principles, you can effectively customize the AntiCheats Addon to create a secure and fair environment for your players.
