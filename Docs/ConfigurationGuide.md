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
    *   **Details:** See the "Customizing Immediate Actions (`actionProfiles.js`)" section below for an in-depth explanation.

*   **AutoMod Configuration (`automodConfig.js`):**
    *   **File:** `AntiCheatsBP/scripts/core/automodConfig.js`
    *   **Purpose:** Contains the rules for the Automated Moderation system. This includes:
        *   `automodRules`: Defines flag thresholds for specific `checkTypes` and the corresponding actions (warn, kick, ban, mute) to take, along with message templates.
        *   `automodPerCheckTypeToggles`: Allows enabling or disabling AutoMod for individual cheat detections.
    *   **Details:** See the "Customizing Automated Moderation (`automodConfig.js`)" section below for an in-depth explanation. (This also links to [AutoMod Details](AutoModDetails.md) which can remain for broader concepts if this guide focuses on file structure).

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

---

## Customizing Immediate Actions (`actionProfiles.js`)

The file `AntiCheatsBP/scripts/core/actionProfiles.js` is crucial for defining the immediate reactions the addon takes when a specific cheat or behavior (`checkType`) is detected.

**Purpose:**
*   Controls initial flagging behavior (how many flags, reason).
*   Determines if and what message admins are notified with.
*   Configures how the detection is logged.
*   Can cancel chat messages or game events for certain checks.

**Structure:**
The file exports a single object `checkActionProfiles`. This object contains key-value pairs, where each key is a `checkType` string in **`camelCase`** (e.g., `movementFlyHover`, `chatSwearViolation`, `worldIllegalItemPlace`). The value is an "Action Profile Entry" object defining the actions for that `checkType`.

```javascript
// Example structure within actionProfiles.js
export const checkActionProfiles = {
    movementFlyHover: { // <--- This is a checkType (must be camelCase)
        enabled: true,
        flag: { /* ...flagging parameters... */ },
        notifyAdmins: { /* ...notification parameters... */ },
        log: { /* ...logging parameters... */ },
        // ... other properties like cancelMessage or cancelEvent
    },
    anotherCheckType: { /* ...its profile... */ }
    // ... more profiles
};
```

**Action Profile Entry Properties:**

For each `checkType` you want to configure, you can define the following properties within its profile entry:

*   `enabled` (boolean):
    *   **Purpose:** Set to `true` to enable this specific set of actions for the `checkType`. Set to `false` to disable these actions (the check might still run silently if enabled in `config.js`, but no actions from this profile will occur).
    *   **Example:** `enabled: true,`

*   `flag` (object, optional):
    *   **Purpose:** Defines how the player is flagged for this violation.
    *   **Properties:**
        *   `increment` (number, optional, default: `1`): The number of flags to add to the player's record for this `checkType`.
        *   `reason` (string): A template for the reason associated with the flag. This message is often shown to the player.
            *   **Placeholders:** You can use placeholders like `{playerName}`, `{checkType}`, and `{detailsString}` (which automatically formats any extra details provided by the check). Specific checks might provide additional placeholders in `violationDetails` (e.g., `{speedBps}`, `{itemTypeId}`). Refer to the specific check's implementation or `actionManager.executeCheckAction` calls to see available `violationDetails` keys.
        *   `type` (string, optional, `camelCase`): The specific internal key under which this flag count is stored in the player's data (`pData.flags`). If omitted, it defaults to the main `checkType` key of the profile (e.g., `movementFlyHover`). You might use a different type to group related sub-detections under a common flag category for AutoMod.
    *   **Example:**
        ```javascript
        flag: {
            increment: 2,
            reason: "System detected Fly (Hover). Speed: {verticalSpeed}",
            type: "movementFly" // All fly-related flags go under 'movementFly'
        },
        ```

*   `notifyAdmins` (object, optional):
    *   **Purpose:** Defines the message sent to online administrators when this detection occurs.
    *   **Properties:**
        *   `message` (string): The template for the admin notification. Uses the same placeholders as `flag.reason`.
    *   **Example:**
        ```javascript
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for {checkType}. Details: {detailsString}"
        },
        ```

*   `log` (object, optional):
    *   **Purpose:** Defines how this event is logged by the `logManager`.
    *   **Properties:**
        *   `actionType` (string, optional, `camelCase`): The specific `actionType` for the log entry (e.g., `detectedFlyHover`, `adminCommandBan`). If omitted, the system often defaults to a pattern like `detected<CheckType>` (e.g., if `checkType` is `movementFlyHover`, log `actionType` might default to `detectedMovementFlyHover`). **It's best practice to define this explicitly using `camelCase`.**
        *   `detailsPrefix` (string, optional): A string to prepend to the `details` field of the log entry.
        *   `includeViolationDetails` (boolean, optional, default: `true`): If `true`, the formatted `violationDetails` string will be appended to the log's `details` field.
    *   **Example:**
        ```javascript
        log: {
            actionType: "detectedFlyHover", // Explicit camelCase
            detailsPrefix: "Fly (Hover Violation): ",
            includeViolationDetails: true
        },
        ```

*   `cancelMessage` (boolean, optional):
    *   **Purpose:** Primarily for chat-related checks (e.g., `chatSwearViolation`). If `true`, the offending chat message that triggered the detection will be cancelled and not shown to other players.
    *   **Example:** `cancelMessage: true,`

*   `cancelEvent` (boolean, optional):
    *   **Purpose:** For checks tied to game events (e.g., `playerPlaceBlock`, `itemUse`). If `true`, the system will attempt to cancel the underlying game event, preventing it from occurring (e.g., stop an illegal block from being placed).
    *   **Example:** `cancelEvent: true,`

*   `customAction` (string, optional, `camelCase`):
    *   **Purpose:** This field is primarily for internal signaling or for future extensions. It allows a profile to indicate a special, non-standard action. Currently, the core `actionManager` does not directly process `customAction` values for general execution. However, specific modules might look for this. For instance, a chat processing module might check for `customAction: 'mutePlayer'` after a `chatSwearViolation` to trigger a mute via `playerDataManager.addMute()`.
    *   **Example:** `customAction: "mutePlayerOnSwear",` (The actual handling of this would be in another module).

**Customization Examples:**

*   **Making a check less severe:**
    ```javascript
    // Original (example)
    // movementSpeedGround: { enabled: true, flag: { increment: 1, reason: "..." } ... }

    // Modified to only log and notify, no flags
    movementSpeedGround: {
        enabled: true,
        flag: null, // or remove the flag property
        notifyAdmins: { message: "§eAC-MONITOR: {playerName} may be speeding. Speed: {speedBps}" },
        log: { actionType: "monitoredSpeedGround", detailsPrefix: "Speed (Ground Monitoring): " }
    },
    ```
*   **Changing notification message for `playerAntiGmc`:**
    ```javascript
    playerAntiGmc: {
        enabled: true,
        flag: { /* ... */ },
        notifyAdmins: {
            message: "§cALERT! {playerName} is in CREATIVE MODE without permission! (Switched: {autoSwitched})"
        },
        log: { /* ... */ }
    },
    ```

**Important Notes for `actionProfiles.js`:**
*   Always back up `actionProfiles.js` before making changes.
*   **`checkType` keys MUST be `camelCase`** and match the exact `checkType` string used when `actionManager.executeCheckAction()` is called by a check script. Mismatches will mean the profile is not found.
*   If a `checkType` is detected by the system but has no corresponding entry in `checkActionProfiles` or its entry is `enabled: false`, no actions from this file will be taken for that specific detection.
*   Test your changes thoroughly on a non-production server to ensure they have the desired effect and don't cause issues.

---

## Customizing Automated Moderation (`automodConfig.js`)

The file `AntiCheatsBP/scripts/core/automodConfig.js` controls the addon's Automated Moderation (AutoMod) system. This system allows you to define escalating punishments based on the number of flags a player accumulates for specific types of violations.

**Purpose:**
*   To automatically issue warnings, kicks, mutes, or bans when players repeatedly trigger cheat detections.
*   To create a tiered punishment system that becomes more severe with more violations.
*   To reduce manual moderation workload for common offenses.

**Prerequisites:**
1.  The global AutoMod system must be enabled in `AntiCheatsBP/scripts/config.js`:
    ```javascript
    export const enableAutoMod = true;
    ```
2.  AutoMod must also be enabled for the specific `checkType` you want to automate actions for (see `automodPerCheckTypeToggles` below).

**Structure of `automodConfig.js`:**
The file exports an object named `automodConfig` with two main properties:

1.  **`automodRules`**: An object where each key is a `checkType` string (in **`camelCase`**, e.g., `movementFlyHover`, `combatCpsHigh`). The value for each `checkType` is an array of `AutoModRule` objects. These rules define the actions to be taken at different flag thresholds for that specific `checkType`.
2.  **`automodPerCheckTypeToggles`**: An object where each key is a `checkType` string (in **`camelCase`**), and the value is a boolean (`true` to enable AutoMod for this check, `false` to disable).

```javascript
// Example structure within automodConfig.js
export const automodConfig = {
    automodRules: {
        movementFlyHover: [ // <--- This is a checkType (must be camelCase)
            { flagThreshold: 10, actionType: 'warn', parameters: { /*...*/ }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: 'kick', parameters: { /*...*/ }, resetFlagsAfterAction: false },
            // ... more rules for movementFlyHover
        ],
        combatCpsHigh: [
            { flagThreshold: 15, actionType: 'warn', parameters: { /*...*/ }, resetFlagsAfterAction: false },
            // ... more rules for combatCpsHigh
        ]
        // ... more checkTypes
    },
    automodPerCheckTypeToggles: {
        movementFlyHover: true, // Enable AutoMod for fly/hover flags
        combatCpsHigh: true,    // Enable AutoMod for CPS flags
        worldNuker: false,      // Disable AutoMod for nuker flags (manual review preferred)
        // ... more toggles
    }
};
```

**`AutoModRule` Object Properties:**

Each rule object within a `checkType` array in `automodRules` has the following properties:

*   `flagThreshold` (number):
    *   **Purpose:** The number of accumulated flags for this specific `checkType` that a player must reach to trigger this rule.
    *   **Example:** `flagThreshold: 10` (triggers when player gets their 10th flag for this `checkType`).

*   `actionType` (string, `camelCase`):
    *   **Purpose:** The automated action to perform.
    *   **Valid Values & Descriptions:**
        *   `warn`: Sends a warning message to the player.
        *   `kick`: Kicks the player from the server.
        *   `tempBan`: Temporarily bans the player. Requires `duration` in `parameters`.
        *   `permBan`: Permanently bans the player.
        *   `mute`: Mutes the player in chat. Requires `duration` in `parameters`. (Note: `automodManager.js` internally handles this as `mute`. If `automodConfig.js` uses `mutePlayer`, ensure consistency or that the manager handles the alias).
        *   `freezePlayer`: (Largely conceptual) Logs and notifies that a player would be frozen. Actual freeze mechanics might need separate implementation beyond AutoMod's direct actions.
        *   `removeIllegalItem`: Attempts to remove a specified illegal item from the player's inventory. Requires `itemToRemoveTypeId` in `parameters`.
        *   `teleportSafe`: Teleports the player to configured safe coordinates. Requires `coordinates` in `parameters`.
        *   `flagOnly`: No direct punitive action is taken on the player by this rule. Instead, it logs that the AutoMod rule was triggered. Useful for monitoring rule effectiveness or for very high flag counts where manual review is preferred after logging.
    *   **Example:** `actionType: "tempBan",`

*   `parameters` (object):
    *   **Purpose:** Provides specific parameters for the chosen `actionType`.
    *   **Sub-Properties:**
        *   `messageTemplate` (string): Template for messages sent to the player (for `warn`, `kick`, `tempBan`, `permBan`, `mute`, `removeIllegalItem`, `teleportSafe`).
            *   **Placeholders:** `{playerName}`, `{actionType}`, `{checkType}`, `{flagCount}` (current flags for this check), `{flagThreshold}` (threshold for this rule), `{duration}` (formatted ban/mute duration), `{itemTypeId}` (for item removal), `{itemQuantity}` (for item removal, actual count removed), `{teleportCoordinates}` (formatted teleport destination).
        *   `adminMessageTemplate` (string, optional): A separate template for notifications sent to admins if this AutoMod rule triggers. Uses the same placeholders. If not provided, a default admin notification might be generated by `automodManager.js`.
        *   `duration` (string, required for `tempBan` and `mute`): Duration of the ban or mute (e.g., `"5m"`, `"1h"`, `"30d"`, `"perm"` for permanent). This string is parsed by the system.
        *   `coordinates` (object, required for `teleportSafe`): Defines the teleport destination: `{ x: number, y: number, z: number }`. `y` is mandatory. `x` and `z` are optional (if omitted, player's current X/Z are used). The system will attempt to find the closest safe location near these coordinates.
        *   `itemToRemoveTypeId` (string, required for `removeIllegalItem`): The Minecraft item ID to remove (e.g., `"minecraft:command_block"`).
    *   **Example:**
        ```javascript
        parameters: {
            duration: "30m",
            messageTemplate: "AutoMod: You've been temp-banned for {duration} due to {checkType} violations ({flagCount} flags).",
            adminMessageTemplate: "AutoMod: {playerName} temp-banned for {duration} ({checkType}, {flagCount} flags)."
        },
        ```

*   `resetFlagsAfterAction` (boolean):
    *   **Purpose:** If `true`, after this AutoMod rule's action is successfully applied, the player's flag count for *this specific `checkType`* will be reset to 0. Their `lastActionThreshold` for this check in `pData.automodState` will also be reset, allowing the punishment ladder to start anew for this check type if they re-offend.
    *   **Example:** `resetFlagsAfterAction: true,`

**Customizing AutoMod Rules (`automodRules`):**

*   **Adjusting Severity:**
    *   Change `flagThreshold` values: Lower thresholds mean quicker punishments.
    *   Modify `actionType`: Escalate from `warn` to `kick` to `tempBan` sooner or later.
    *   Alter `parameters.duration` for `tempBan` or `mute`.
*   **Customizing Messages:**
    *   Edit `messageTemplate` and `adminMessageTemplate` using the available placeholders to provide clear information.
*   **Adding/Removing Rules:**
    *   To add a new punishment tier for a `checkType`, add a new `AutoModRule` object to its array. Ensure the array remains sorted by `flagThreshold` (lowest to highest) for predictable escalation.
    *   To remove a punishment tier, delete the corresponding rule object from the array.
*   **Adding Rules for a New `checkType`:**
    *   If you've implemented a new cheat detection that flags with a new `checkType` (e.g., `myCustomCheck`), you can add AutoMod rules for it:
        ```javascript
        // In automodRules
        myCustomCheck: [
            { flagThreshold: 5, actionType: 'warn', parameters: { messageTemplate: "Warning for My Custom Check!" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: 'kick', parameters: { messageTemplate: "Kicked for My Custom Check!" }, resetFlagsAfterAction: true }
        ],
        // In automodPerCheckTypeToggles
        myCustomCheck: true,
        ```

**Customizing `automodPerCheckTypeToggles`:**

*   Simply set the value for a `checkType` to `true` to allow AutoMod rules defined in `automodRules` for that check to be processed.
*   Set it to `false` to disable AutoMod for that `checkType`, regardless of any rules defined in `automodRules`. This is useful if you want a check to only flag and notify admins for manual review, without automatic punishments.

**Interaction Flow:**
1.  A check script detects a violation (e.g., `flyCheck.js` detects hovering).
2.  It calls `actionManager.executeCheckAction()` with the `checkType` (e.g., `movementFlyHover`).
3.  `actionManager` consults `actionProfiles.js` for `movementFlyHover`.
4.  The profile in `actionProfiles.js` says to flag the player (e.g., add 2 flags of type `movementFlyHover`). `playerDataManager.addFlag()` is called.
5.  `playerDataManager.addFlag()` then calls `automodManager.processAutoModActions()` for the `movementFlyHover` flag type.
6.  `automodManager` checks if `enableAutoMod` (in `config.js`) is true AND if `automodPerCheckTypeToggles.movementFlyHover` (in `automodConfig.js`) is true.
7.  If both are true, `automodManager` looks at the player's current total flags for `movementFlyHover` and compares it against the `flagThreshold` of rules in `automodConfig.js` under `automodRules.movementFlyHover`.
8.  If a threshold is met and the rule hasn't been surpassed or actioned at that exact flag count, the corresponding `actionType` (e.g., `warn`, `kick`) is executed.

**Important Notes for `automodConfig.js`:**
*   Always back up `automodConfig.js` before making changes.
*   **`checkType` keys and `actionType` values MUST be `camelCase`**. Mismatches will cause rules or actions to fail.
*   Ensure rules within a `checkType` array are logically ordered by `flagThreshold` if you intend an escalating punishment system.
*   The `duration` strings for bans/mutes must be in a format recognized by `playerUtils.parseDuration` (e.g., "10s", "5m", "1h", "7d", "1mo", "perm").
*   Thoroughly test any AutoMod rule changes on a non-production server to ensure they trigger correctly and apply the intended actions without unintended side effects. Pay close attention to `resetFlagsAfterAction` behavior.

---
By understanding these configuration files and principles, you can effectively customize the AntiCheats Addon to create a secure and fair environment for your players.
