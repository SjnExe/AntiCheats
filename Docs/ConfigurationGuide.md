# AntiCheats Addon: Configuration Guide

This guide provides an overview of how to configure the AntiCheats Addon for your Minecraft Bedrock Edition world. Proper configuration is key to tailoring the addon's behavior to your server's specific needs.

## 🛠️ Initial Setup & Permissions

These are the first crucial steps after installing the addon:

1. **Set the Server Owner (Vital for Full Control):**
   - **File:** `AntiCheatsBP/scripts/config.js`
   - **Setting:** `ownerPlayerName`
   - **Action:** Change the placeholder value of `ownerPlayerName` to your **exact** in-game Minecraft name (case-sensitive). This is a JavaScript string, so it must be enclosed in quotes.
   ```javascript
   // Example in AntiCheatsBP/scripts/config.js
   export const ownerPlayerName = "YourExactPlayerName";
   ```
   - **Importance:** The Owner rank has the highest level of permissions, including access to sensitive configurations and commands. Without setting this correctly, you may not have full control over the addon.
2. **Assign Admin Permissions:**
   - **File:** `AntiCheatsBP/scripts/config.js`
   - **Setting:** `adminTag`
   - **Action:** This variable defines the Minecraft tag that grants players administrative privileges within the AntiCheat system (e.g., access to `!panel`, moderation commands). The default is usually `"admin"`.
   ```javascript
   // Example in AntiCheatsBP/scripts/config.js
   export const adminTag = "admin";
   ```
   - **Usage:** To make a player an admin, use Minecraft's built-in `/tag` command:
     `/tag "PlayerName" add admin` (or whatever tag you've set in `adminTag`).

For more details on how ranks and permissions work, see the [Rank System Guide](RankSystem.md).

## 🔧 Main Configuration Hub: `config.js`

The primary configuration file for the AntiCheats Addon is:
**`AntiCheatsBP/scripts/config.js`**

This file is extensively commented and allows you to customize a wide range of settings, including but not limited to:

- **Core System Settings:**
  - `prefix`: The chat command prefix (default: `!`).
  - `enableDebugLogging`: Toggle for detailed console logs, useful for troubleshooting.
  - Global toggles for major features like `enableAutoMod`, `enableTpaSystem`, `enableWorldBorderSystem`, etc.
- **Debugging & Development Settings:**
  - `enablePerformanceProfiling`: Toggle for collecting and logging performance metrics. Useful for identifying bottlenecks. (Default: `false`)
  - `logPerformanceProfileIntervalTicks`: How often to log performance data if `enablePerformanceProfiling` is true. (Default: `1200` ticks / 60 seconds)
- **Cheat Detection Parameters:**
  - Enable/disable individual cheat checks (e.g., `enableFlyCheck`, `enableReachCheck`).
  - Adjust sensitivity, thresholds, and specific conditions for many detections (e.g., `maxCpsThreshold`, `reachDistanceSurvival`, `flySustainedVerticalSpeedThreshold`).
- **Behavioral Settings:**
  - Messages for welcomer, death coordinates, etc.
  - Default settings for features like World Border damage or AutoMod mute durations.
- **Individual Command Toggles:**
  - `commandSettings`: An object to enable or disable specific commands individually.
  - *Note on Command Aliases:* Previously, `config.js` might have contained a global `commandAliases` object. This has been deprecated. Command aliases are now defined directly within each command's definition object (typically in `AntiCheatsBP/scripts/commands/yourcommand.js`) under an `aliases` array.
  ```javascript
  // Example in a command file like AntiCheatsBP/scripts/commands/version.js
  export const definition = {
      name: 'version',
      aliases: ['v', 'ver'], // Aliases for the version command
      description: 'Displays the AntiCheat addon version.',
      permissionLevel: 1024, // Member
  };
  ```

**Structure of `config.js`:**
The `config.js` file primarily exports constants. Many of these are grouped into an `editableConfigValues` object. This special object allows some (but not all) configuration values to be modified at runtime by the server Owner via the `!panel` UI or potentially a dedicated `!acconfig` command (if implemented).

> [!IMPORTANT]
> Always make a backup of `config.js` before making significant changes. Incorrectly modifying this file can lead to errors or unexpected behavior.

## 📄 Specialized Configuration Files

While `config.js` is the central hub, some complex systems have their detailed rule-sets in dedicated files within the `AntiCheatsBP/scripts/core/` directory. These are then typically imported or referenced by `config.js` or other core manager scripts.

- **Action Profiles (`actionProfiles.js`):**
  - **File:** `AntiCheatsBP/scripts/core/actionProfiles.js`
  - **Purpose:** Defines what happens when a specific cheat detection (`checkType`) is triggered. This includes whether to flag the player, how many flags to add, the reason message, whether to notify admins, and if the action should be logged.
  - **Linkage:** The `checkType` string used in these profiles (e.g., `movementFlyHover`) is what links a detection in a check script (like `flyCheck.js`) to its consequences.
  - **Details:** See the "Customizing Immediate Actions (`actionProfiles.js`)" section below for an in-depth explanation.
- **AutoMod Configuration (`automodConfig.js`):**
  - **File:** `AntiCheatsBP/scripts/core/automodConfig.js`
  - **Purpose:** Contains the rule sets for the Automated Moderation system. This includes:
    - `automodRuleSets`: An array where each element defines a complete rule set for a specific `checkType`. A rule set includes an `enabled` toggle for that specific check's AutoMod, a description, an optional flag reset cooldown, and an array of `tiers` (previously rules) that define escalating actions based on flag thresholds.
  - **Details:** See the "Customizing Automated Moderation (`automodConfig.js`)" section below for an in-depth explanation. (This also links to [AutoMod Details](AutoModDetails.md) which can remain for broader concepts if this guide focuses on file structure).
- **Rank Definitions (`ranksConfig.js`):**
  - **File:** `AntiCheatsBP/scripts/core/ranksConfig.js`
  - **Purpose:** Defines the available ranks (Owner, Admin, Member, etc.), their permission levels, chat formatting, and conditions for assignment.
  - **Details:** See [Rank System Guide](RankSystem.md).
- **Text Database (`textDatabase.js`):**
  - **File:** `AntiCheatsBP/scripts/core/textDatabase.js`
  - **Purpose:** A simple key-value store for most user-facing UI text and command response messages. This allows for easier text management and potential future localization. The `playerUtils.getString(key, params)` function is used to retrieve and format these strings.

- **Kits Definition (`kits.js`):**
  - **File:** `AntiCheatsBP/scripts/core/kits.js`
  - **Purpose:** Defines the available kits that players can claim. You can add, remove, or modify kits in this file, including their items, cooldowns, and descriptions.

## ⚙️ Server Features Configuration

In `config.js`, you can enable and configure several server utility features.

- **Economy System:**
  - `economy.enabled` (boolean): Set to `true` to enable the economy system (`!pay`, `!balance`, `!baltop`).
  - `economy.startingBalance` (number): The amount of money new players start with.
- **Homes System:**
  - `homes.enabled` (boolean): Set to `true` to enable the homes system (`!sethome`, `!home`, etc.).
  - `homes.maxHomes` (number): The maximum number of homes a player is allowed to set.
- **Kits System:**
  - `kits.enabled` (boolean): Set to `true` to enable the kits system (`!kit`). The kits themselves are defined in `AntiCheatsBP/scripts/core/kits.js`.
- **Custom Spawn:**
  - `spawnLocation` (object | null): Set a specific spawn location for the `!spawn` command. If `null`, the world's default spawn is used. The object should look like: `{ x: number, y: number, z: number, dimension: string }`. You can set this in-game using `!spawn set`.

## Best Practices for Configuration

- **Read Comments:** `config.js` and other configuration files are usually well-commented. Read these comments carefully before changing values.
- **Start Small:** If you're unsure about a setting, change it by a small amount and observe the effect on your server.
- **Test Thoroughly:** After making configuration changes, test them to ensure they work as expected and don't cause false positives or unwanted side effects.
- **Backup:** Before major changes, always back up your `config.js` and other relevant configuration files.
- **Consult Documentation:** For complex systems like AutoMod or World Border, refer to their specific detailed guides in the `Docs/` folder.

By understanding these configuration files and principles, you can effectively customize the AntiCheats Addon to create a secure and fair environment for your players.

---

## Customizing Immediate Actions (`actionProfiles.js`)

The file `AntiCheatsBP/scripts/core/actionProfiles.js` is crucial for defining the immediate reactions the addon takes when a specific cheat or behavior (`checkType`) is detected.

**Purpose:**

- Controls initial flagging behavior (how many flags, reason).
- Determines if and what message admins are notified with.
- Configures how the detection is logged.
- Can cancel chat messages or game events for certain checks.

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

- `enabled` (boolean):
  - **Purpose:** Set to `true` to enable this specific set of actions for the `checkType`. Set to `false` to disable these actions (the check might still run silently if enabled in `config.js`, but no actions from this profile will occur).
  - **Example:** `enabled: true,`
- `flag` (object, optional):
  - **Purpose:** Defines how the player is flagged for this violation.
  - **Properties:**
    - `increment` (number, optional, default: `1`): The number of flags to add to the player's record for this `checkType`.
    - `reason` (string): A template for the reason associated with the flag. This message is often shown to the player.
      - **Placeholders:** You can use placeholders like `{playerName}`, `{checkType}`, and `{detailsString}` (which automatically formats any extra details provided by the check). Specific checks might provide additional placeholders in `violationDetails` (e.g., `{speedBps}`, `{itemTypeId}`). Refer to the specific check's implementation or `actionManager.executeCheckAction` calls to see available `violationDetails` keys.
    - `type` (string, optional, `camelCase`): The specific internal key under which this flag count is stored in the player's data (`pData.flags`). If omitted, it defaults to the main `checkType` key of the profile (e.g., `movementFlyHover`). You might use a different type to group related sub-detections under a common flag category for AutoMod.
  - **Example:**
  ```javascript
  flag: {
      increment: 2,
      reason: "System detected Fly (Hover). Speed: {verticalSpeed}",
      type: "movementFly" // All fly-related flags go under 'movementFly'
  },
  ```
- `notifyAdmins` (object, optional):
  - **Purpose:** Defines the message sent to online administrators when this detection occurs.
  - **Properties:**
    - `message` (string): The template for the admin notification. Uses the same placeholders as `flag.reason`.
  - **Example:**
  ```javascript
  notifyAdmins: {
      message: "§eAC: {playerName} flagged for {checkType}. Details: {detailsString}"
  },
  ```
- `log` (object, optional):
  - **Purpose:** Defines how this event is logged by the `logManager`.
  - **Properties:**
    - `actionType` (string, optional, `camelCase`): The specific `actionType` for the log entry (e.g., `detectedFlyHover`, `adminCommandBan`). If omitted, the system often defaults to a pattern like `detected<CheckType>` (e.g., if `checkType` is `movementFlyHover`, log `actionType` might default to `detectedMovementFlyHover`). **It's best practice to define this explicitly using `camelCase`.**
    - `detailsPrefix` (string, optional): A string to prepend to the `details` field of the log entry.
    - `includeViolationDetails` (boolean, optional, default: `true`): If `true`, the formatted `violationDetails` string will be appended to the log's `details` field.
  - **Example:**
  ```javascript
  log: {
      actionType: "detectedFlyHover", // Explicit camelCase
      detailsPrefix: "Fly (Hover Violation): ",
      includeViolationDetails: true
  },
  ```
- `cancelMessage` (boolean, optional):
  - **Purpose:** Primarily for chat-related checks (e.g., `chatSwearViolation`). If `true`, the offending chat message that triggered the detection will be cancelled and not shown to other players.
  - **Example:** `cancelMessage: true,`
- `cancelEvent` (boolean, optional):
  - **Purpose:** For checks tied to game events (e.g., `playerPlaceBlock`, `itemUse`). If `true`, the system will attempt to cancel the underlying game event, preventing it from occurring (e.g., stop an illegal block from being placed).
  - **Example:** `cancelEvent: true,`
- `customAction` (string, optional, `camelCase`):
  - **Purpose:** This field is primarily for internal signaling or for future extensions. It allows a profile to indicate a special, non-standard action. Currently, the core `actionManager` does not directly process `customAction` values for general execution. However, specific modules might look for this. For instance, a chat processing module might check for `customAction: 'mutePlayer'` after a `chatSwearViolation` to trigger a mute via `playerDataManager.addMute()`.
  - **Example:** `customAction: "mutePlayerOnSwear",` (The actual handling of this would be in another module).

**Customization Examples:**

- **Making a check less severe:**
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
- **Changing notification message for `playerAntiGmc`:**
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

- Always back up `actionProfiles.js` before making changes.
- **`checkType` keys MUST be `camelCase`** and match the exact `checkType` string used when `actionManager.executeCheckAction()` is called by a check script. Mismatches will mean the profile is not found.
- If a `checkType` is detected by the system but has no corresponding entry in `checkActionProfiles` or its entry is `enabled: false`, no actions from this file will be taken for that specific detection.
- Test your changes thoroughly on a non-production server to ensure they have the desired effect and don't cause issues.

---

## Sound Event Configuration (`config.js`)

The `AntiCheatsBP/scripts/config.js` file allows you to configure sounds that play for various in-game events related to the AntiCheat system. This is managed through the `soundEvents` object within the main configuration.

**Structure of `soundEvents`:**

```javascript
// Example in config.js (within defaultConfigSettings or editableConfigValues)
soundEvents: {
    eventName1: {
        enabled: true,
        soundId: "minecraft:random.orb",
        volume: 1.0,
        pitch: 1.0,
        target: "player", // "player", "admin", "targetPlayer", "global"
        description: "A brief note about when this sound plays."
    },
    eventName2: { /* ... other sound event ... */ }
}
```

**Properties for each `eventName`:**

- `enabled` (boolean):
  - **Purpose:** Set to `true` to enable this sound, `false` to disable it.
  - **Default:** Varies per event (see `config.example.js` or `config.js`).
- `soundId` (string):
  - **Purpose:** The Minecraft sound ID to play (e.g., `"random.orb"`, `"note.pling"`, `"mob.villager.no"`).
  - **Finding Sound IDs:** You can find a comprehensive list of vanilla sound IDs on the [Official Minecraft Wiki](https://minecraft.fandom.com/wiki/Sounds.json). You can also discover them using in-game commands like `/playsound`.
  - **Behavior:** If empty, `null`, or an invalid ID, no sound will play for this event even if `enabled` is true.
- `volume` (number, optional):
  - **Purpose:** Sets the volume of the sound.
  - **Range:** Typically `0.0` (silent) to `1.0` (normal). Values above 1.0 might amplify but can cause distortion.
  - **Default:** `1.0` if not specified.
- `pitch` (number, optional):
  - **Purpose:** Sets the pitch of the sound.
  - **Range:** `0.0` to `2.0`. `1.0` is normal pitch. Lower values are deeper, higher values are higher-pitched.
  - **Default:** `1.0` if not specified.
- `target` (string, optional):
  - **Purpose:** Determines who hears the sound.
  - **Valid Values:**
    - `"player"`: The primary player associated with the event (e.g., the one executing a command, the one receiving a warning). This is often the default if `target` is omitted or invalid.
    - `"admin"`: All online administrators who have their AntiCheat notifications enabled (respects `ac_notifications_on`/`_off` tags and `acGlobalNotificationsDefaultOn` config).
    - `"targetPlayer"`: A specific secondary player involved in an event (e.g., the player receiving a TPA request). The utility function `playSoundForEvent` needs to be called with this target player context.
    - `"global"`: All players currently online. **Use this with extreme caution** as it can be very spammy.
  - **Default:** Typically `"player"` if not specified.
- `description` (string):
  - **Purpose:** A human-readable description of when this sound is intended to play. This is for configuration reference and does not affect in-game behavior.

**Currently Configurable Sound Events (Examples):**

- `tpaRequestReceived`: Sound for the player who receives a TPA or TPAHere request.
- `adminNotificationReceived`: Sound for an admin when they receive any AntiCheat system notification (via `playerUtils.notifyAdmins`).
- `playerWarningReceived`: Sound for a player when they receive a direct warning (via `playerUtils.warnPlayer`).
- `uiFormOpen`: (Example, default disabled) Sound when a UI form is opened for a player.
- `commandSuccess`: (Example, default disabled) Sound for a player upon successful command execution.
- `commandError`: (Example, default disabled) Sound for a player when their command results in an error.
- `automodActionTaken`: Sound for a player when AutoMod takes a significant action (kick, mute, ban) against them.

Refer to the `soundEvents` object within `defaultConfigSettings` in `config.js` for the full list of available sound event keys and their default settings.

---

## Customizing Automated Moderation (`automodConfig.js`)

The file `AntiCheatsBP/scripts/core/automodConfig.js` controls the addon's Automated Moderation (AutoMod) system. This system allows you to define escalating punishments based on the number of flags a player accumulates for specific types of violations.

**Purpose:**

- To automatically issue warnings, kicks, mutes, or bans when players repeatedly trigger cheat detections.
- To create a tiered punishment system that becomes more severe with more violations.
- To reduce manual moderation workload for common offenses.

**Prerequisites:**

1. The global AutoMod system must be enabled in `AntiCheatsBP/scripts/config.js`:
```javascript
// In config.js, within editableConfigValues or defaultConfigSettings
enableAutoMod: true,
```
2. For a specific `checkType` to be processed by AutoMod, its corresponding rule set in `automodConfig.js` must have `enabled: true`.

**Structure of `automodConfig.js`:**
The file exports an object named `automodConfig`. This object contains a single main property:

- **`automodRuleSets`**: An array of `AutoModRuleSet` objects. Each `AutoModRuleSet` defines the automated actions for a specific `checkType`.

```javascript
// Example structure within automodConfig.js
export const automodConfig = {
    automodRuleSets: [
        {
            checkType: 'movementFlyHover', // <--- This is a checkType (must be camelCase)
            enabled: true,                 // Enable AutoMod for this specific checkType
            description: 'Actions for persistent hovering/flying.',
            resetFlagsAfterSeconds: 300,   // Optional: Cooldown to reset flags if no new violations
            tiers: [                       // Array of action tiers (previously rules)
                { flagThreshold: 10, actionType: 'warn', parameters: { /*...*/ }, resetFlagsAfterAction: false },
                { flagThreshold: 20, actionType: 'kick', parameters: { /*...*/ }, resetFlagsAfterAction: false },
                // ... more tiers for movementFlyHover
            ]
        },
        {
            checkType: 'combatCpsHigh',
            enabled: true,
            description: 'Actions for high CPS.',
            tiers: [
                { flagThreshold: 15, actionType: 'warn', parameters: { /*...*/ }, resetFlagsAfterAction: false },
                // ... more tiers for combatCpsHigh
            ]
        }
        // ... more rule sets for other checkTypes
    ]
};
```

**`AutoModRuleSet` Object Properties:**

Each object within the `automodRuleSets` array has the following properties:

- `checkType` (string, `camelCase`):
  - **Purpose:** The specific type of violation this rule set applies to (e.g., `movementFlyHover`, `chatSwearViolation`). This **must match** the `checkType` used in `actionProfiles.js` and by the detection scripts.
  - **Example:** `checkType: 'movementFlyHover'`
- `enabled` (boolean):
  - **Purpose:** Set to `true` to enable AutoMod processing for this specific `checkType`. If `false`, no automated actions from this rule set will be taken, even if the global `enableAutoMod` in `config.js` is true.
  - **Example:** `enabled: true`
- `description` (string, optional):
  - **Purpose:** A human-readable description of what this rule set is for. Useful for configuration management.
  - **Example:** `description: 'Handles automated responses to players detected flying or hovering.'`
- `resetFlagsAfterSeconds` (number, optional):
  - **Purpose:** If specified, and a player has accumulated flags for this `checkType` but has not triggered an AutoMod action from this rule set (i.e., their flag count is below the lowest `flagThreshold` or actions are only warnings), their flags for this specific `checkType` will be reset to 0 after this many seconds of inactivity (no new flags for this `checkType`). This helps prevent flags from lingering indefinitely for minor, non-escalating offenses.
  - **Example:** `resetFlagsAfterSeconds: 3600` (reset flags after 1 hour of no new violations for this check type, if no punitive action was taken)
- `tiers` (array of `AutoModTier` objects):
  - **Purpose:** An array defining the escalating punishment tiers for this `checkType`. Each object in the array represents one tier of action. **Tiers should be sorted by `flagThreshold` in ascending order.**

**`AutoModTier` Object Properties (within the `tiers` array):**

Each tier object defines a specific action to be taken when a flag threshold is met:

- `flagThreshold` (number):
  - **Purpose:** The number of accumulated flags for this rule set's `checkType` that a player must reach to trigger this tier's action.
  - **Example:** `flagThreshold: 10`
- `actionType` (string, `camelCase`):
  - **Purpose:** The automated action to perform.
  - **Valid Values & Descriptions:**
    - `warn`: Sends a warning message to the player.
    - `kick`: Kicks the player from the server.
    - `tempBan`: Temporarily bans the player. Requires `duration` in `parameters`.
    - `permBan`: Permanently bans the player.
    - `mute`: Mutes the player in chat. Requires `duration` in `parameters`.
    - `freezePlayer`: (Largely conceptual in `automodConfig.js`) Logs and notifies that a player would be frozen. The actual freeze mechanic is usually tied to the `!freeze` command or specific checks, not directly executed by `automodManager` based on this `actionType` alone.
    - `removeIllegalItem`: Attempts to remove a specified illegal item from the player's inventory. Requires `itemToRemoveTypeId` in `parameters`.
    - `teleportSafe`: Teleports the player to configured safe coordinates. Requires `coordinates` in `parameters`.
    - `flagOnly`: No direct punitive action is taken on the player by this tier. Instead, it logs that the AutoMod tier was triggered. Useful for monitoring or as an intermediate step.
  - **Example:** `actionType: "tempBan",`
- `parameters` (object):
  - **Purpose:** Provides specific parameters for the chosen `actionType`.
  - **Sub-Properties:**
    - `messageTemplate` (string): Template for messages sent to the player (for `warn`, `kick`, `tempBan`, `permBan`, `mute`, `removeIllegalItem`, `teleportSafe`).
      - **Placeholders:** `{playerName}`, `{actionType}`, `{checkType}`, `{flagCount}` (current flags for this check), `{flagThreshold}` (threshold for this tier), `{duration}` (formatted ban/mute duration), `{itemTypeId}` (for item removal), `{itemQuantity}` (for item removal, actual count removed), `{teleportCoordinates}` (formatted teleport destination).
    - `adminMessageTemplate` (string, optional): A separate template for notifications sent to admins if this AutoMod tier triggers. Uses the same placeholders. If not provided, a default admin notification might be generated.
    - `duration` (string, required for `tempBan` and `mute`): Duration of the ban or mute (e.g., `"5m"`, `"1h"`, `"30d"`, `"perm"` for permanent). This string is parsed by the system.
    - `coordinates` (object, required for `teleportSafe`): Defines the teleport destination: `{ x: number, y: number, z: number }`. `y` is mandatory. `x` and `z` are optional (if omitted, player's current X/Z are used). The system will attempt to find the closest safe location near these coordinates.
    - `itemToRemoveTypeId` (string, required for `removeIllegalItem`): The Minecraft item ID to remove (e.g., `"minecraft:command_block"`).
  - **Example:**
  ```javascript
  parameters: {
      duration: "30m",
      messageTemplate: "AutoMod: You've been temp-banned for {duration} due to {checkType} violations ({flagCount} flags).",
      adminMessageTemplate: "AutoMod: {playerName} temp-banned for {duration} ({checkType}, {flagCount} flags)."
  },
  ```
- `resetFlagsAfterAction` (boolean, optional, default: `false`):
  - **Purpose:** If `true`, after this tier's action is successfully applied, the player's flag count for *this specific `checkType`* will be reset to 0. Their `lastActionThreshold` for this check in `pData.automodState` will also be reset, allowing the punishment ladder to start anew for this check type if they re-offend.
  - **Example:** `resetFlagsAfterAction: true`

**Customizing AutoMod Rule Sets:**

- **Enabling/Disabling AutoMod for a Check:**
  - Set the `enabled` property within the rule set object for a specific `checkType` to `true` or `false`.
- **Adjusting Severity within a Rule Set:**
  - Modify `flagThreshold` values in the `tiers` array.
  - Change `actionType` in different tiers.
  - Alter `parameters.duration` for `tempBan` or `mute`.
- **Customizing Messages:**
  - Edit `messageTemplate` and `adminMessageTemplate` in the `parameters` of each tier.
- **Adding/Removing Tiers:**
  - To add a new punishment tier, add a new `AutoModTier` object to the `tiers` array of the relevant rule set. Ensure the `tiers` array remains sorted by `flagThreshold`.
  - To remove a tier, delete its object from the `tiers` array.
- **Adding a Rule Set for a New `checkType`:**
  - Add a new `AutoModRuleSet` object to the `automodRuleSets` array. Define its `checkType`, `enabled` status, optional `description` and `resetFlagsAfterSeconds`, and its `tiers`.
  ```javascript
  // In automodRuleSets array
  {
      checkType: 'myNewCheckType',
      enabled: true,
      description: 'Handles my new custom check.',
      tiers: [
          { flagThreshold: 5, actionType: 'warn', parameters: { messageTemplate: "Warning for My New Check!" }, resetFlagsAfterAction: false },
          { flagThreshold: 10, actionType: 'kick', parameters: { messageTemplate: "Kicked for My New Check!" }, resetFlagsAfterAction: true }
      ]
  }
  ```

**Interaction Flow (Updated):**

1. A check script detects a violation (e.g., `flyCheck.js` detects hovering).
2. It calls `actionManager.executeCheckAction()` with the `checkType` (e.g., `movementFlyHover`).
3. `actionManager` consults `actionProfiles.js` for `movementFlyHover`.
4. The profile in `actionProfiles.js` says to flag the player. `playerDataManager.addFlag()` is called.
5. `playerDataManager.addFlag()` then calls `automodManager.processAutoModActions()` for the `movementFlyHover` flag type.
6. `automodManager` checks if the global `enableAutoMod` (in `config.js`) is true.
7. If true, it finds the `AutoModRuleSet` in `automodConfig.js` where `checkType` matches `movementFlyHover`.
8. If a matching rule set is found and its `enabled` property is `true`:
   - `automodManager` iterates through the `tiers` in that rule set.
   - For each tier, it compares the player's current total flags for `movementFlyHover` against the tier's `flagThreshold`.
   - If a threshold is met and the action for that tier hasn't already been surpassed or recently applied for that specific flag count, the corresponding `actionType` (e.g., `warn`, `kick`) is executed.

**Important Notes for `automodConfig.js` (Updated):**

- Always back up `automodConfig.js` before making changes.
- **`checkType` in rule sets and `actionType` in tiers MUST be `camelCase`**. This is a strict requirement for the system to correctly match them.
- Ensure `tiers` within each rule set are logically ordered by `flagThreshold` (lowest to highest) for predictable escalation.
- The `duration` strings for bans/mutes must be in a format recognized by `playerUtils.parseDuration`.
- Thoroughly test any AutoMod rule changes. Pay close attention to `resetFlagsAfterAction` and the new `resetFlagsAfterSeconds` behavior.

---

By understanding these configuration files and principles, you can effectively customize the AntiCheats Addon to create a secure and fair environment for your players.
