# Automated Moderation (AutoMod) Details

The AutoMod system is designed to automatically take action against players who repeatedly trigger cheat detections. It is highly configurable and aims to reduce the manual workload on administrators.

## How It Works
When a player triggers a specific cheat detection (e.g., for flying, speeding), they accumulate flags for that particular type of cheat (`checkType`). The AutoMod system monitors these flag counts. If a player's flag count for a `checkType` reaches a predefined threshold, AutoMod will execute a configured sequence of actions.

## Configuration
AutoMod is configured through **`AntiCheatsBP/scripts/config.js`** (for the global `enableAutoMod` toggle and overall settings) and primarily through **`AntiCheatsBP/scripts/core/automodConfig.js`** (for specific rules, messages, and per-check type toggles, which are then utilized by the main settings in `config.js`).

### 1. Global AutoMod Toggle
- **File:** `AntiCheatsBP/scripts/config.js`
- **Setting:** Look for `enableAutoMod` (or a similarly named variable) within this file.
- **Usage:** Set to `true` to enable the entire AutoMod system, or `false` to disable it globally.
  ```javascript
  // Example in config.js
  export const enableAutoMod = true; // or false
  // This value is then accessible via editableConfigValues.enableAutoMod at runtime.
  ```

### 2. Per-CheckType AutoMod Toggles
- **File:** `AntiCheatsBP/scripts/core/automodConfig.js` (this whole object is then typically assigned to a key in `editableConfigValues` in `config.js`)
- **Setting:** `automodPerCheckTypeToggles`
- **Usage:** This object allows you to enable or disable AutoMod for specific `checkType`s. `checkType`s should follow `camelCase` naming (e.g., `movementFlyHover`). If a `checkType` is not listed or is `true`, AutoMod will be active for it (if `enableAutoMod` is also `true`).
  ```javascript
  // Inside automodConfig.js
  export const automodConfig = {
    // ...
    automodPerCheckTypeToggles: {
      "movementFlyHover": true,  // AutoMod enabled for this checkType
      "combatCpsHigh": false, // AutoMod disabled for this checkType
      // ... other checkTypes
    },
    // ...
  };
  ```

### 3. AutoMod Rules (`automodRules`)
- **File:** `AntiCheatsBP/scripts/core/automodConfig.js`
- **Setting:** `automodRules`
- **Structure:** An object where each key is a `checkType` string (e.g., `"movementFlyHover"`, `"worldNuker"`), following `camelCase` convention as per `Dev/CodingStyle.md`. Specifically, acronyms like GMC, TPA, etc., should be uppercase within the camelCase identifier (e.g., `playerAntiGMC`). The value for each `checkType` is an array of `actionStep` objects, processed in order.
- **`actionStep` Object Properties:**
  - `flagThreshold` (number): The number of flags for this `checkType` at which this action step is triggered.
  - `actionType` (string): The type of action to take (e.g., `warn`, `kick`, `tempBan`). See "Supported Action Types" below. These should be `camelCase` if multi-word (e.g. `tempBan`).
  - `parameters` (object): Action-specific parameters.
    - `reasonKey` (string): A key to look up the message/reason in `automodActionMessages`.
    - `duration` (string, optional): For actions like `tempBan` or `mute` (e.g., "30m", "1h", "7d").
    - `coordinates` (object, optional): For `teleportSafe` action, e.g., `{ x: 0, y: 100, z: 0 }`.
    - `itemToRemoveTypeId` (string, optional): For `removeIllegalItem` action, specifying the item `TypeId`.
    - *(Other parameters might be used by specific actions in the future).*
  - `resetFlagsAfterAction` (boolean, optional): If `true`, the flag count for this specific `checkType` will be reset to 0 after this action is performed. Defaults to `false`.

- **Example Rule:**
  ```javascript
  // In automodConfig.js, within the automodRules object:
  "movementFlyHover": [ // checkType in camelCase
    {
      "flagThreshold": 3,
      "actionType": "warn", // actionType in camelCase (or single word lowercase)
      "parameters": { "reasonKey": "automod.fly.hover.warn1" }
    },
    {
      "flagThreshold": 5,
      "actionType": "kick",
      "parameters": { "reasonKey": "automod.fly.hover.kick1" }
    },
    {
      "flagThreshold": 10,
      "actionType": "tempBan", // camelCase for multi-word
      "parameters": { "duration": "1h", "reasonKey": "automod.fly.hover.tempban1" },
      "resetFlagsAfterAction": true
    }
  ],
  ```

### 4. Supported Action Types (`actionType`)
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

### 5. Action Messages (`automodActionMessages`)
- **File:** `AntiCheatsBP/scripts/core/automodConfig.js`
- **Setting:** `automodActionMessages`
- **Usage:** This is an object mapping `reasonKey` strings (used in `automodRules`) to the actual text messages that will be shown to players or used in logs. This allows for easy customization and potential localization of messages.
  ```javascript
  export const automodActionMessages = {
    "automod.fly.hover.warn1": "Automated Warning: Unusual flight activity detected.",
    "automod.default.kick": "You have been kicked by AutoMod.",
    // ... other messages
  };
  ```

## Important Notes
- The AutoMod system processes rules based on escalating `flagThresholds` for each `checkType`.
- The `pData.automodState[checkType].lastActionThreshold` is used to prevent the same action from being repeatedly applied if the flag count hasn't increased beyond that threshold (unless flags are reset).
- All actions taken by AutoMod are logged in the Admin Action Logs (viewable via `!panel`) with "AutoMod" as the issuer.
- Administrators are also notified in chat when AutoMod takes a significant action.
