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

---

## Advanced Rule Examples

Below are some examples demonstrating more complex or nuanced AutoMod rule configurations. These are intended to inspire and guide you in tailoring the AutoMod system to your server's specific needs. Remember to test your configurations thoroughly.

### Example 1: Multi-Stage Progressive Punishment for a Common Cheat (e.g., `movementFlyHover`)

This example shows a more granular approach to a common cheat, with multiple warnings, shorter temp-bans, and eventually a longer ban, using `resetFlagsAfterAction` strategically.

```javascript
// In automodConfig.js, within the automodRules object:
"movementFlyHover": [
  {
    "flagThreshold": 5, // First very gentle warning
    "actionType": "warn",
    "parameters": {
      "messageTemplate": "AutoMod: {playerName}, possible {checkType} detected. Please ensure you are following server rules. (Flags: {flagCount}/{flagThreshold})"
    },
    "resetFlagsAfterAction": false // Keep flags accumulating
  },
  {
    "flagThreshold": 10, // Second, more direct warning
    "actionType": "warn",
    "parameters": {
      "messageTemplate": "AutoMod Warning: {playerName}, {checkType} violation ({flagCount}/{flagThreshold}). Continued violations will result in further action."
    },
    "resetFlagsAfterAction": false
  },
  {
    "flagThreshold": 15, // A short temp-ban, flags reset to give a chance
    "actionType": "tempBan",
    "parameters": {
      "duration": "5m", // 5 minutes
      "messageTemplate": "AutoMod: {playerName} has been temporarily banned for {duration} due to {checkType}. (Flags: {flagCount}/{flagThreshold})"
    },
    "resetFlagsAfterAction": true // Reset flags for this check after this action
  },
  // If player re-offends after the first temp-ban and flag reset:
  {
    "flagThreshold": 10, // Lower threshold for re-offense after a reset
    "actionType": "warn",
    "parameters": {
      "messageTemplate": "AutoMod Notice: {playerName}, {checkType} detected again ({flagCount}/{flagThreshold}). Further infractions will lead to longer bans."
    },
    "resetFlagsAfterAction": false
  },
  {
    "flagThreshold": 20, // Longer temp-ban if they continue after the first reset
    "actionType": "tempBan",
    "parameters": {
      "duration": "1h", // 1 hour
      "messageTemplate": "AutoMod: {playerName} has been temporarily banned for {duration} due to persistent {checkType}. (Flags: {flagCount}/{flagThreshold})"
    },
    "resetFlagsAfterAction": false // Don't reset yet, accumulate towards permBan
  },
  {
    "flagThreshold": 30, // Final threshold for this checkType
    "actionType": "permBan", // Or a very long tempBan like "30d"
    "parameters": {
      "messageTemplate": "AutoMod: {playerName} has been permanently banned due to repeated {checkType} violations. (Flags: {flagCount}/{flagThreshold})"
    },
    "resetFlagsAfterAction": true // Reset flags if action is taken
  }
]
```
**Explanation:**
*   Starts with gentle warnings.
*   A short temp-ban with a flag reset gives the player a chance to correct behavior.
*   If they re-offend, the thresholds for subsequent actions are effectively lower (as flags start from 0 again for that check), but the punishments escalate more quickly to a longer temp-ban and then a permanent ban.
*   `resetFlagsAfterAction: false` is used for the longer temp-ban to ensure that if an admin unbans them, their flag count is still high, leading to a permaban quickly if they continue.

### Example 2: Handling a Sensitive or Potentially Noisy Check (e.g., `combatInvalidPitch`)

For checks that might have legitimate edge cases or be prone to false positives due to lag or unusual playstyles, a more cautious approach is needed.

```javascript
// In automodConfig.js, within the automodRules object:
"combatInvalidPitch": [ // Example for a sensitive check
  {
    "flagThreshold": 5,
    "actionType": "flagOnly", // Just log it internally, no player action
    "parameters": {
        // Optional: Use adminMessageTemplate to notify admins silently
        "adminMessageTemplate": "AutoMod Log: {playerName} reached {flagCount}/{flagThreshold} for {checkType}. Monitoring."
    },
    "resetFlagsAfterAction": false
  },
  {
    "flagThreshold": 10,
    "actionType": "flagOnly",
     "parameters": {
        "adminMessageTemplate": "AutoMod Log: {playerName} now at {flagCount}/{flagThreshold} for {checkType}. High suspicion."
    },
    "resetFlagsAfterAction": false
  },
  {
    "flagThreshold": 15,
    "actionType": "warn", // First player-visible action is a very gentle warning
    "parameters": {
      "messageTemplate": "AutoMod: {playerName}, unusual view angles detected. Please ensure your gameplay is standard. (Flags: {flagCount}/{flagThreshold} for {checkType})"
    },
    "resetFlagsAfterAction": false
  },
  {
    "flagThreshold": 25,
    "actionType": "kick", // Kick as a stronger deterrent if warnings ignored
    "parameters": {
      "messageTemplate": "AutoMod: {playerName} kicked due to persistent unusual view angles ({checkType}). (Flags: {flagCount}/{flagThreshold})"
    },
    "resetFlagsAfterAction": true // Reset after kick to see if behavior changes
  }
  // Further actions like tempBan could be added if necessary, but start conservatively.
]
```
**Explanation:**
*   Uses `flagOnly` for initial detections. This allows admins to monitor logs or receive silent notifications (via `adminMessageTemplate`) without impacting the player.
*   The first actual player-facing action is a mild warning at a higher threshold.
*   A kick is used as a more significant deterrent, with flags reset to see if the behavior corrects.
*   This approach minimizes player frustration from potentially false flags while still gathering data and eventually acting on persistent offenders.

### Example 3: Using `removeIllegalItem` and `freeze` for an Item-Specific Violation (e.g., `worldIllegalItemUse`)

This example demonstrates using specific actions like `removeIllegalItem` and `freeze` for violations related to possessing or using banned items.

```javascript
// In automodConfig.js, within the automodRules object:
"worldIllegalItemUse": [ // Assuming this checkType is for using a specific known illegal item
  {
    "flagThreshold": 1, // Act immediately on first detection
    "actionType": "warn",
    "parameters": {
      "itemToRemoveTypeId": "minecraft:bedrock", // Example: if bedrock is illegal
      "messageTemplate": "AutoMod: {playerName}, use of illegal item ({itemTypeId}) detected. The item will be removed. (Flags: {flagCount}/{flagThreshold})"
    },
    "resetFlagsAfterAction": false
  },
  {
    "flagThreshold": 2, // If they somehow use it again quickly
    "actionType": "removeIllegalItem",
    "parameters": {
      "itemToRemoveTypeId": "minecraft:bedrock", // Must match the item this check flags
      "messageTemplate": "AutoMod: Removed illegal item ({itemTypeId}) from {playerName}. Quantity removed: {itemQuantity}. (Flags: {flagCount}/{flagThreshold})"
      // "adminMessageTemplate": "Admin: Removed {itemQuantity} of {itemTypeId} from {playerName} due to {checkType}." // Optional
    },
    "resetFlagsAfterAction": false // Don't reset yet, see if they try to get more
  },
  {
    "flagThreshold": 5, // If they persist in acquiring and using the illegal item
    "actionType": "freeze", // Freeze them, perhaps for an admin to investigate
    "parameters": {
      "messageTemplate": "AutoMod: {playerName} has been frozen due to repeated attempts to use illegal item ({itemTypeId}). An admin will investigate. (Flags: {flagCount}/{flagThreshold})"
    },
    "resetFlagsAfterAction": false
  },
  {
    "flagThreshold": 10, // If they are unfrozen and continue
    "actionType": "tempBan",
    "parameters": {
      "duration": "1h",
      "itemToRemoveTypeId": "minecraft:bedrock", // Optional: ensure item is gone if re-acquired
      "messageTemplate": "AutoMod: {playerName} temporarily banned for {duration} for persistent illegal item ({itemTypeId}) violations. (Flags: {flagCount}/{flagThreshold})"
    },
    "resetFlagsAfterAction": true
  }
]
```
**Explanation:**
*   The first rule warns and informs the player the item will be removed (even if the actual removal is in the next step, this prepares them).
*   The `removeIllegalItem` action specifically targets the problematic item. The `checkType` `worldIllegalItemUse` should ideally be designed to only flag for specific, pre-configured illegal items.
*   `freeze` is used to temporarily immobilize the player, giving admins a chance to intervene and investigate how they are acquiring/using the items.
*   A `tempBan` follows if the behavior continues, potentially also attempting to remove the item again if the `removeIllegalItem` action supports being part of other action parameters (this addon's specific implementation detail would matter here; typically, `itemToRemoveTypeId` is for the `removeIllegalItem` action itself). If not, the `removeIllegalItem` action should be robust.

---
Remember to adjust `flagThreshold` values based on how quickly your checks accumulate flags and how tolerant you want the system to be. Always test your AutoMod rules thoroughly on a non-production server or with test accounts.
