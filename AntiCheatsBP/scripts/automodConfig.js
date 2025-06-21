/**
 * @file AntiCheatsBP/scripts/automodConfig.js
 * Defines rules and messages for the Automated Moderation system.
 * @version 1.0.0
 */

// Defines the sequence of actions for each checkType based on flag thresholds.
export const automodRules = {
  "flyYVelocity": [ // Example checkType, ensure this matches a real checkType string
    {
      "flagThreshold": 2,
      "actionType": "warn",
      "parameters": { "reasonKey": "automod.fly.warn1" },
      "resetFlagsAfterAction": false
    },
    {
      "flagThreshold": 4,
      "actionType": "kick",
      "parameters": { "reasonKey": "automod.fly.kick1" }
    },
    {
      "flagThreshold": 6,
      "actionType": "tempBan",
      "parameters": { "duration": "30m", "reasonKey": "automod.fly.tempban1" }
    }
  ],
  "speedGround": [ // Example checkType
    {
      "flagThreshold": 3,
      "actionType": "warn",
      "parameters": { "reasonKey": "automod.speed.warn1" }
    },
    {
      "flagThreshold": 6,
      "actionType": "kick",
      "parameters": { "reasonKey": "automod.speed.kick1" }
    }
  ],
  "nukerBreakSpeed": [ // Example for a check that might be more sensitive
    {
      "flagThreshold": 1,
      "actionType": "flagOnly", // Special action type: only flags, no other punishment
      "parameters": { "reasonKey": "automod.nuker.flag" } // Still good to have a reason for logging
    },
    {
      "flagThreshold": 3,
      "actionType": "warn",
      "parameters": { "reasonKey": "automod.nuker.warn1" }
    }
  ],
  "reachCombat": [
    { "flagThreshold": 5, "actionType": "warn", "parameters": { "reasonKey": "automod.reach.warn1" } },
    { "flagThreshold": 10, "actionType": "tempBan", "parameters": { "duration": "2h", "reasonKey": "automod.reach.tempban1" } },
    { "flagThreshold": 15, "actionType": "permBan", "parameters": { "reasonKey": "automod.reach.permban1" } }
  ],
  "chatSpamFast": [
    { "flagThreshold": 3, "actionType": "warn", "parameters": { "reasonKey": "automod.chatspam.warn" } },
    { "flagThreshold": 5, "actionType": "mute", "parameters": { "duration": "15m", "reasonKey": "automod.chatspam.mute" } }
  ],
  "flySevereLong": [
    { "flagThreshold": 1, "actionType": "freeze", "parameters": { "reasonKey": "automod.flysevere.freeze" } },
    { "flagThreshold": 1, "actionType": "warn", "parameters": { "reasonKey": "automod.flysevere.warn" }, "resetFlagsAfterAction": false },
    { "flagThreshold": 3, "actionType": "kick", "parameters": { "reasonKey": "automod.flysevere.kick" } }
  ],
  "illegalItemPossession": [
    {
      "flagThreshold": 1,
      "actionType": "removeIllegalItem",
      "parameters": { "reasonKey": "automod.illegalitem.removed_generic" },
      "resetFlagsAfterAction": true
    },
    {
      "flagThreshold": 2,
      "actionType": "warn",
      "parameters": { "reasonKey": "automod.illegalitem.warn_repeat" }
    }
  ]
  // Add more check types and their rules here as needed
};

// Centralized messages for AutoMod actions.
export const automodActionMessages = {
  "automod.fly.warn1": "Automated Warning: Unusual vertical movement detected. Please play fair.",
  "automod.fly.kick1": "Automated Kick: Persistent unusual vertical movement detected.",
  "automod.fly.tempban1": "Automated Temp Ban: Excessive unusual vertical movement. Duration: 30 minutes.",
  "automod.speed.warn1": "Automated Warning: Unnaturally fast movement detected.",
  "automod.speed.kick1": "Automated Kick: Persistent unnaturally fast movement.",
  "automod.nuker.flag": "Automated Flag: Rapid block breaking detected.",
  "automod.nuker.warn1": "Automated Warning: Suspiciously fast block breaking. Further infractions may lead to stricter actions.",
  "automod.reach.warn1": "Automated Warning: Suspicious combat reach detected.",
  "automod.reach.tempban1": "Automated Temp Ban: Persistent suspicious combat reach. Duration: 2 hours.",
  "automod.reach.permban1": "Automated Permanent Ban: Excessive and persistent combat reach violations.",
  "automod.chatspam.warn": "Automated Warning: Please do not spam the chat.",
  "automod.chatspam.mute": "Automated Mute: You have been muted for 15 minutes due to chat spam.",
  "automod.flysevere.freeze": "Automated Action: You have been frozen due to highly suspicious movement.",
  "automod.flysevere.warn": "Automated Warning: Severe flight-like activity detected. You are frozen. An admin will investigate.",
  "automod.flysevere.kick": "Automated Kick: Persistent severe rule violations after being frozen.",
  "automod.illegalitem.removed_generic": "AutoMod: Detected illegal item(s) removed from your inventory.",
  "automod.illegalitem.warn_repeat": "AutoMod Warning: Illegal items have been detected in your possession multiple times. Please adhere to server rules."
  // Add more messages as rules are defined
};

/**
 * @type {Object.<string, boolean>}
 * Enables or disables AutoMod functionality for specific check types.
 * If a checkType is not listed here, AutoMod is assumed to be ENABLED for it (provided global enableAutoMod is true).
 * Set a checkType to 'false' to disable AutoMod specifically for it.
 * Example:
 *   "flyYVelocity": true,  // AutoMod enabled for flyYVelocity
 *   "reachCombat": false, // AutoMod disabled for reachCombat
 */
export const automodPerCheckTypeToggles = {
  "flyYVelocity": true,
  "speedGround": true,
  "nukerBreakSpeed": true,
  "reachCombat": true,
  "chatSpamFast": true,
  "flySevereLong": true,
  "illegalItemPossession": true
  // Add new checkTypes here if you want to explicitly set their AutoMod toggle.
  // If a checkType from automodRules is NOT listed here, it defaults to AutoMod being ON for it.
};
