// Anti-Cheat Configuration File

/** @type {string} Tag required for players to be recognized as administrators. */
export const adminTag = "admin";

/**
 * @type {string}
 * Stores the exact in-game name of the project owner.
 * This is used to grant special permissions or bypass certain checks
 * for the owner. Case-sensitive.
 */
export const ownerPlayerName = "PlayerNameHere"; // TODO: Replace with actual owner name

/** @type {boolean} If true, enables detailed console logging for debugging purposes. */
export const enableDebugLogging = true;

/** @type {string} The prefix used for chat-based commands (e.g., "!ac version"). */
export const prefix = "!";

// --- General Check Toggles ---

/** @type {boolean} If true, the Reach check is active. */
export const enableReachCheck = true;
/** @type {boolean} If true, the CPS (Clicks Per Second) check is active. */
export const enableCpsCheck = true;
/** @type {boolean} If true, the View Snap / Invalid Pitch check is active. */
export const enableViewSnapCheck = true;
/** @type {boolean} If true, the Multi-Target Killaura check is active. */
export const enableMultiTargetCheck = true;
/** @type {boolean} If true, various state conflict checks (e.g., attack while sleeping) are active. */
export const enableStateConflictCheck = true;
/** @type {boolean} If true, the Fly check (both sustained and hover) is active. */
export const enableFlyCheck = true;
/** @type {boolean} If true, the Speed check is active. */
export const enableSpeedCheck = true;
/** @type {boolean} If true, the NoFall check is active. */
export const enableNofallCheck = true;
/** @type {boolean} If true, the Nuker check is active. */
export const enableNukerCheck = true;
/** @type {boolean} If true, the Illegal Item check (both use and place) is active. */
export const enableIllegalItemCheck = true;


// --- Movement Checks ---

/**
 * @type {number}
 * Maximum vertical speed (intended interpretation: blocks per second, but actual check logic may vary).
 */
export const maxVerticalSpeed = 10;

/**
 * @type {number}
 * Maximum horizontal speed (intended interpretation: blocks per second).
 * Default sprint speed is ~5.6 blocks/sec.
 */
export const maxHorizontalSpeed = 15;

/**
 * @type {number}
 * Flat bonus to maximum horizontal speed (blocks/sec) per level of the Speed effect.
 */
export const speedEffectBonus = 2.0;

/**
 * @type {number}
 * Minimum fall distance in blocks that is expected to cause fall damage.
 */
export const minFallDistanceForDamage = 3.5;

/**
 * @type {number}
 * Threshold for vertical speed (blocks per tick, positive is upward) for sustained fly detection.
 */
export const flySustainedVerticalSpeedThreshold = 0.5;

/**
 * @type {number}
 * Number of consecutive off-ground ticks, while exceeding `flySustainedVerticalSpeedThreshold`, to trigger a fly flag.
 */
export const flySustainedOffGroundTicksThreshold = 10;

/**
 * @type {number}
 * Minimum height in blocks above the last known ground position for hover detection.
 */
export const flyHoverNearGroundThreshold = 3;

/**
 * @type {number}
 * Vertical speed (absolute value, blocks per tick) below which a player is considered hovering.
 */
export const flyHoverVerticalSpeedThreshold = 0.08;

/**
 * @type {number}
 * Number of consecutive off-ground ticks, while meeting hover conditions, to trigger a hover flag.
 */
export const flyHoverOffGroundTicksThreshold = 20;

/**
 * @type {number}
 * Maximum fall distance accumulated while hovering.
 */
export const flyHoverMaxFallDistanceThreshold = 1.0;

/**
 * @type {number}
 * A tolerance buffer added to the maximum horizontal speed.
 */
export const speedToleranceBuffer = 0.5;

/**
 * @type {number}
 * Number of consecutive ticks a player must exceed max horizontal speed on ground to be flagged.
 */
export const speedGroundConsecutiveTicksThreshold = 5;


// --- Combat Checks ---

/** @type {number} Maximum clicks per second (CPS) threshold. */
export const maxCpsThreshold = 20;

/** @type {number} Maximum reach distance in blocks for Survival/Adventure mode. */
export const reachDistanceSurvival = 4.5;

/** @type {number} Maximum reach distance in blocks for Creative mode. */
export const reachDistanceCreative = 6.0;

/** @type {number} A small buffer added to maximum reach distance. */
export const reachBuffer = 0.5;

/** @type {number} Time window in milliseconds for calculating CPS. */
export const cpsCalculationWindowMs = 1000;

// --- View Snap / Invalid Pitch (Aimbot/Killaura components) ---
/** @type {number} Max degrees pitch can change in one tick after an attack. */
export const maxPitchSnapPerTick = 75;
/** @type {number} Max degrees yaw can change in one tick after an attack. */
export const maxYawSnapPerTick = 100;
/** @type {number} Ticks after an attack to monitor for view snaps. */
export const viewSnapWindowTicks = 10;
/** @type {number} Minimum pitch considered invalid. */
export const invalidPitchThresholdMin = -90.5;
/** @type {number} Maximum pitch considered invalid. */
export const invalidPitchThresholdMax = 90.5;
/** @type {string} Reason message for invalid pitch flags. */
export const flagReasonInvalidPitch = "Invalid Pitch";
/** @type {string} Reason message for view snap flags. */
export const flagReasonViewSnap = "View Snap";
/** @type {number} Flag increment value for view snap related flags. */
export const flagIncrementViewSnap = 1; // addFlag default increment is 1, so this might not be needed by addFlag

// --- Multi-Target Killaura ---
/** @type {number} Time window in milliseconds for multi-target detection. */
export const multiTargetWindowMs = 1000;
/** @type {number} Number of distinct entities hit within the window to trigger a flag. */
export const multiTargetThreshold = 3;
/** @type {number} Maximum number of recent hit records to store per player. */
export const multiTargetMaxHistory = 10;
/** @type {string} Reason message for multi-target aura flags. */
export const flagReasonMultiAura = "Multi-Target Aura";
// export const flagIncrementMultiAura = 1; // Default in addFlag

// --- State Conflict Checks (Killaura components) ---
/** @type {string} Reason message for attacking while sleeping. */
export const flagReasonAttackWhileSleeping = "Attack While Sleeping";
// export const flagIncrementAttackSleep = 1; // Default in addFlag


// --- World Checks ---

/** @type {number} Max blocks broken in `nukerCheckIntervalMs` for Nuker. */
export const nukerMaxBreaksShortInterval = 4;

/** @type {number} Time window in milliseconds for Nuker check. */
export const nukerCheckIntervalMs = 200;

/** @type {string[]} Array of item type IDs banned from being placed. */
export const bannedItemsPlace = ["minecraft:command_block", "minecraft:moving_block"];

/** @type {string[]} Array of item type IDs banned from being used. */
export const bannedItemsUse = [];

// --- Chat Checks ---

/** @type {boolean} If true, checks for newline/carriage return characters in chat messages. */
export const enableNewlineCheck = true;

/** @type {boolean} If true, sending a message with newlines/carriage returns will flag the player. */
export const flagOnNewline = true;

/** @type {boolean} If true, messages containing newlines/carriage returns will be cancelled and not sent. */
export const cancelMessageOnNewline = true;

/** @type {boolean} If true, checks if chat messages exceed the maximum configured length. */
export const enableMaxMessageLengthCheck = true;

/** @type {number} Maximum allowed character length for a chat message. */
export const maxMessageLength = 256; // Minecraft default is 256

/** @type {boolean} If true, sending a message exceeding max length will flag the player. */
export const flagOnMaxMessageLength = true;

/** @type {boolean} If true, messages exceeding max length will be cancelled. */
export const cancelOnMaxMessageLength = true;

/** @type {boolean} If true, checks for players sending the same/similar messages repeatedly. */
export const spamRepeatCheckEnabled = true;

/** @type {number} Number of identical/similar messages within the time window to trigger a spam flag. */
export const spamRepeatMessageCount = 3;

/** @type {number} Time window in seconds to monitor for repeated messages. */
export const spamRepeatTimeWindowSeconds = 5;

/** @type {boolean} If true, flags the player for repeated message spam. */
export const spamRepeatFlagPlayer = true;

/** @type {boolean} If true, cancels the message that triggers the repeated spam detection. Generally false for this check. */
export const spamRepeatCancelMessage = false;

// --- X-Ray Detection ---

/** @type {boolean} If true, enables notifications for mining valuable ores. */
export const xrayDetectionNotifyOnOreMineEnabled = true; // Note: This was XRAY_DETECTION_NOTIFY_ON_ORE_MINE_ENABLED, but not in the list for change. Keeping it as per file for now.

/** @type {string[]} List of block type IDs to monitor for mining notifications. */
export const xrayDetectionMonitoredOres = [
    "minecraft:diamond_ore",
    "minecraft:deepslate_diamond_ore",
    "minecraft:ancient_debris",
    "minecraft:emerald_ore",
    "minecraft:deepslate_emerald_ore"
];

/** @type {boolean} If true, admins will receive X-Ray mining notifications by default, unless they explicitly turn them off. */
export const xrayDetectionAdminNotifyByDefault = true;

/**
 * @type {boolean}
 * If true, admins will receive all AntiCheat system notifications by default,
 * unless they explicitly turn them off using !acnotifications off.
 */
export const acGlobalNotificationsDefaultOn = true;

// --- UI Display Texts ---

/** @type {string[]} Defines the server rules to be displayed in the UI. Each string is a rule line. */
export const serverRules = [
  "1. Be respectful to all players and staff.",
  "2. No cheating, exploiting, or unfair advantages.",
  "3. No griefing or stealing.",
  "4. Do not spam chat or use excessive caps.",
  "5. PVP is only allowed in designated areas or if agreed upon."
];

/** @type {{title: string, url: string}[]} Defines links to be displayed in the Help & Links UI. */
export const helpLinks = [
  { title: "Our Discord Server", url: "https://discord.gg/YourInviteCode" },
  { title: "Website/Forums", url: "https://yourwebsite.com/forums" },
  { title: "Report a Player", url: "https://yourwebsite.com/report" }
];

/** @type {string[]} General help messages or tips to display in the UI. */
export const generalHelpMessages = [
  "Welcome to the server! We hope you have a great time.",
  "For a list of commands, type !help in chat.",
  "If you suspect a player of cheating, please use the report link or contact staff.",
  "Please be familiar with our server rules, available via !panel."
];

// --- System ---

/** @type {string} The current version of the AntiCheat system. */
export const acVersion = "v__VERSION_STRING__";

// --- Command Aliases ---
/**
 * @typedef {Object.<string, string>} CommandAliasMap
 * @description Maps short alias strings to full command names.
 * Example: { "b": "ban", "k": "kick" }
 */

/** @type {CommandAliasMap} Defines aliases for commands. */
export const commandAliases = {
    "v": "version",
    "w": "watch",
    "i": "inspect",
    "rf": "resetflags",
    "xn": "xraynotify",
    "mf": "myflags",
    "notifications": "notify",
    "ui": "panel"
    // Add more aliases as commands are developed
};

// --- Editable Configuration ---

// This object will hold the current values of configurations that can be edited at runtime.
// It's initialized with the default values from the const declarations above.
export let editableConfigValues = {
    adminTag: adminTag,
    ownerPlayerName: ownerPlayerName,
    enableDebugLogging: enableDebugLogging,
    prefix: prefix,
    enableReachCheck: enableReachCheck,
    enableCpsCheck: enableCpsCheck,
    enableViewSnapCheck: enableViewSnapCheck,
    enableMultiTargetCheck: enableMultiTargetCheck,
    enableStateConflictCheck: enableStateConflictCheck,
    enableFlyCheck: enableFlyCheck,
    enableSpeedCheck: enableSpeedCheck,
    enableNofallCheck: enableNofallCheck,
    enableNukerCheck: enableNukerCheck,
    enableIllegalItemCheck: enableIllegalItemCheck,
    maxVerticalSpeed: maxVerticalSpeed,
    maxHorizontalSpeed: maxHorizontalSpeed,
    speedEffectBonus: speedEffectBonus,
    minFallDistanceForDamage: minFallDistanceForDamage,
    flySustainedVerticalSpeedThreshold: flySustainedVerticalSpeedThreshold,
    flySustainedOffGroundTicksThreshold: flySustainedOffGroundTicksThreshold,
    flyHoverNearGroundThreshold: flyHoverNearGroundThreshold,
    flyHoverVerticalSpeedThreshold: flyHoverVerticalSpeedThreshold,
    flyHoverOffGroundTicksThreshold: flyHoverOffGroundTicksThreshold,
    flyHoverMaxFallDistanceThreshold: flyHoverMaxFallDistanceThreshold,
    speedToleranceBuffer: speedToleranceBuffer,
    speedGroundConsecutiveTicksThreshold: speedGroundConsecutiveTicksThreshold,
    maxCpsThreshold: maxCpsThreshold,
    reachDistanceSurvival: reachDistanceSurvival,
    reachDistanceCreative: reachDistanceCreative,
    reachBuffer: reachBuffer,
    cpsCalculationWindowMs: cpsCalculationWindowMs,
    maxPitchSnapPerTick: maxPitchSnapPerTick,
    maxYawSnapPerTick: maxYawSnapPerTick,
    viewSnapWindowTicks: viewSnapWindowTicks,
    invalidPitchThresholdMin: invalidPitchThresholdMin,
    invalidPitchThresholdMax: invalidPitchThresholdMax,
    multiTargetWindowMs: multiTargetWindowMs,
    multiTargetThreshold: multiTargetThreshold,
    multiTargetMaxHistory: multiTargetMaxHistory,
    nukerMaxBreaksShortInterval: nukerMaxBreaksShortInterval,
    nukerCheckIntervalMs: nukerCheckIntervalMs,
    enableNewlineCheck: enableNewlineCheck,
    flagOnNewline: flagOnNewline,
    cancelMessageOnNewline: cancelMessageOnNewline,
    enableMaxMessageLengthCheck: enableMaxMessageLengthCheck,
    maxMessageLength: maxMessageLength,
    flagOnMaxMessageLength: flagOnMaxMessageLength,
    cancelOnMaxMessageLength: cancelOnMaxMessageLength,
    spamRepeatCheckEnabled: spamRepeatCheckEnabled,
    spamRepeatMessageCount: spamRepeatMessageCount,
    spamRepeatTimeWindowSeconds: spamRepeatTimeWindowSeconds,
    spamRepeatFlagPlayer: spamRepeatFlagPlayer,
    spamRepeatCancelMessage: spamRepeatCancelMessage,
    xrayDetectionNotifyOnOreMineEnabled: xrayDetectionNotifyOnOreMineEnabled, // Matches prompt
    xrayDetectionAdminNotifyByDefault: xrayDetectionAdminNotifyByDefault,
    acGlobalNotificationsDefaultOn: acGlobalNotificationsDefaultOn,
};

/**
 * Updates a configuration value in memory.
 * @param {string} key The configuration key to update.
 * @param {boolean|string|number} newValue The new value for the configuration.
 * @returns {boolean} True if the update was successful, false otherwise.
 */
export function updateConfigValue(key, newValue) {
    if (!editableConfigValues.hasOwnProperty(key)) {
        console.warn(`[ConfigManager] Attempted to update non-existent config key: ${key}`);
        return false;
    }

    const originalValue = editableConfigValues[key];
    const originalType = typeof originalValue;
    const newType = typeof newValue;

    if (originalType !== newType) {
        // Allow string to number conversion if original is number and newValue is a parsable string
        if (originalType === 'number' && newType === 'string') {
            const parsedValue = Number(newValue);
            if (!isNaN(parsedValue)) {
                editableConfigValues[key] = parsedValue;
                if (enableDebugLogging) console.log(`[ConfigManager] Updated ${key} from ${originalValue} to ${parsedValue} (type coerced from string)`);
                return true;
            } else {
                console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected ${originalType}, got ${newType} (unparsable string for number). Update rejected.`);
                return false;
            }
        } else {
            console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected ${originalType}, got ${newType}. Update rejected.`);
            return false;
        }
    }

    editableConfigValues[key] = newValue;
    if (enableDebugLogging) console.log(`[ConfigManager] Updated ${key} from ${originalValue} to ${newValue}`);
    return true;
}
