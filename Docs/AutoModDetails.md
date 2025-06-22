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
- **Structure:** An object where each key is a `checkType` string (e.g., `"movementFlyHover"`, `"worldNuker"`), following `camelCase` convention as per `Dev/CodingStyle.md`. The value for each `checkType` is an array of `AutoModRule` objects.
- **`AutoModRule` Object Properties:**
  - `flagThreshold` (number): The number of flags for this `checkType` at which this rule is triggered.
  - `actionType` (string): The type of action to take (e.g., `warn`, `kick`, `tempBan`). See "Supported Action Types" below.
  - `parameters` (object): Action-specific parameters.
    - `messageTemplate` (string): The message template string for this rule. This string can contain placeholders (see "Using Placeholders in Message Templates" below).
    - `adminMessageTemplate` (string, optional): An optional, admin-specific message template. If not provided, a default admin message format is used. Can also use placeholders.
    - `duration` (string, optional): For actions like `tempBan` or `mute` (e.g., "30m", "1h", "7d").
    - `coordinates` (object, optional): For `teleportSafe` action, e.g., `{ y: 100 }` or `{ x: 0, y: 100, z: 0 }`.
    - `itemToRemoveTypeId` (string, optional): For `removeIllegalItem` action, specifying the item `TypeId`.
    - *(Other parameters might be used by specific actions in the future).*
  - `resetFlagsAfterAction` (boolean, optional): If `true`, the flag count for this specific `checkType` will be reset to 0 after this action. Defaults to `false`.

- **Example Rule:**
  ```javascript
  // In automodConfig.js, within the automodRules object:
  "movementFlyHover": [ // checkType in camelCase
    {
      "flagThreshold": 3,
      "actionType": "warn",
      "parameters": {
        "messageTemplate": "AutoMod [{actionType}|{checkType}]: {playerName}, you have {flagCount} flags for hovering. Please land."
        // "adminMessageTemplate": "Admin: {playerName} warned for {checkType} ({flagCount}/{flagThreshold})" // Optional
      }
    },
    {
      "flagThreshold": 10,
      "actionType": "tempBan",
      "parameters": {
        "duration": "1h",
        "messageTemplate": "AutoMod [{actionType}|{checkType}]: {playerName} banned for {duration} due to {checkType} (Flags: {flagCount}/{flagThreshold})."
      },
      "resetFlagsAfterAction": true
    }
  ],
  ```

### 4. Supported Action Types (`actionType`)
The following `actionType` strings can be used in your `automodRules`:
- `flagOnly`: Takes no direct punitive action. Useful for sensitive checks or as an initial step. Logs that the rule was processed.
- `warn`: Sends a configurable warning message (from `parameters.messageTemplate`) to the player's chat.
- `kick`: Kicks the player from the server with a reason generated from `parameters.messageTemplate`.
- `tempBan`: Temporarily bans the player for a duration specified in `parameters.duration`. Kick reason generated from `parameters.messageTemplate`.
- `permBan`: Permanently bans the player. Kick reason generated from `parameters.messageTemplate`.
- `mute`: Temporarily mutes the player for a duration specified in `parameters.duration`. Player notification generated from `parameters.messageTemplate`.
- `freeze`: Freezes the player (prevents movement). Player notification generated from `parameters.messageTemplate`. (Note: Actual freeze mechanic might be command-based).
- `removeIllegalItem`: Removes all instances of a specific illegal item (specified by `parameters.itemToRemoveTypeId`) from the player's inventory. Player notification generated from `parameters.messageTemplate`.
- `teleportSafe`: Teleports the player to a safe location (e.g., specific coordinates in `parameters.coordinates`). Player notification generated from `parameters.messageTemplate`.

### 5. Using Placeholders in Message Templates
Message templates defined in `parameters.messageTemplate` (and optional `parameters.adminMessageTemplate`) support dynamic placeholders to create informative messages. AutoMod replaces these with actual data at runtime.

**How to Use:**
Include placeholders (e.g., `{playerName}`) within your template strings in the rule definition.

**Example (already shown in Rule Structure above):**
```javascript
// parameters: {
//   "messageTemplate": "AutoMod [{actionType}|{checkType}]: {playerName}, you have {flagCount} flags. Max is {flagThreshold}."
// }
```

**Available Placeholders:**
The following placeholders can be used in `messageTemplate` and `adminMessageTemplate`:

*   **Core Placeholders:**
    *   `{playerName}`: The name of the player affected.
    *   `{actionType}`: The type of action taken (e.g., "warn", "kick").
    *   `{checkType}`: The check that triggered the rule (e.g., "movementFlyHover").
    *   `{flagCount}`: The player's current flag count for the `checkType`.
    *   `{flagThreshold}`: The flag threshold that triggered this rule.

*   **Punishment/Duration Specific Placeholders:**
    *   `{duration}`: Human-readable duration (e.g., "5m", "1h", "Permanent"). Used by `tempBan`, `mute`.

*   **Action-Specific Placeholders:**
    *   `{itemTypeId}`: For `removeIllegalItem`, the `typeId` of the item.
    *   `{itemQuantity}`: For `removeIllegalItem`, the quantity of the item removed.
    *   `{teleportCoordinates}`: For `teleportSafe`, string representation of target/actual coordinates.

*   **Error Message Placeholder (primarily for teleport error messages):**
    *   `{errorMessage}`: If an error occurs during an action (e.g., teleport fails), this can provide the error message.

Admins will be notified using the `adminMessageTemplate` if provided in the rule's parameters, otherwise a default comprehensive message is generated by the system.

## Important Notes
- The AutoMod system processes rules based on escalating `flagThresholds` for each `checkType`.
- The `pData.automodState[checkType].lastActionThreshold` is used to prevent the same action from being repeatedly applied if the flag count hasn't increased beyond that threshold (unless flags are reset).
- All actions taken by AutoMod are logged in the Admin Action Logs (viewable via `!panel`) with "AutoMod" as the issuer.
- Administrators are also notified in chat when AutoMod takes a significant action.
