/**
 * @file AntiCheatsBP/scripts/automodConfig.js
 * Defines rules and messages for the Automated Moderation system.
 * @version 1.0.0
 */

// Defines the sequence of actions for each checkType based on flag thresholds.
export const automodRules = {
  "fly_y_velocity": [ // Example checkType, ensure this matches a real checkType string
    {
      "flagThreshold": 2,
      "actionType": "WARN",
      "parameters": { "reasonKey": "automod.fly.warn1" },
      "resetFlagsAfterAction": false
    },
    {
      "flagThreshold": 4,
      "actionType": "KICK",
      "parameters": { "reasonKey": "automod.fly.kick1" }
    },
    {
      "flagThreshold": 6,
      "actionType": "TEMP_BAN",
      "parameters": { "duration": "30m", "reasonKey": "automod.fly.tempban1" }
    }
  ],
  "speed_ground": [ // Example checkType
    {
      "flagThreshold": 3,
      "actionType": "WARN",
      "parameters": { "reasonKey": "automod.speed.warn1" }
    },
    {
      "flagThreshold": 6,
      "actionType": "KICK",
      "parameters": { "reasonKey": "automod.speed.kick1" }
    }
  ],
  "nuker_break_speed": [ // Example for a check that might be more sensitive
    {
      "flagThreshold": 1,
      "actionType": "FLAG_ONLY", // Special action type: only flags, no other punishment
      "parameters": { "reasonKey": "automod.nuker.flag" } // Still good to have a reason for logging
    },
    {
      "flagThreshold": 3,
      "actionType": "WARN",
      "parameters": { "reasonKey": "automod.nuker.warn1" }
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
  // Add more messages as rules are defined
};
