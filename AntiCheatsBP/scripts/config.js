// Anti-Cheat Configuration File

/** @type {string} Tag required for players to be recognized as administrators. */
export const adminTag = "admin";

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
export const bannedItemsPlace: string[] = ["minecraft:command_block", "minecraft:moving_block"];

/** @type {string[]} Array of item type IDs banned from being used. */
export const bannedItemsUse: string[] = [];

// --- Chat Checks ---

/** @type {boolean} If true, checks for newline/carriage return characters in chat messages. */
export const enableNewlineCheck = true;

/** @type {boolean} If true, sending a message with newlines/carriage returns will flag the player. */
export const flagOnNewline = true;

/** @type {boolean} If true, messages containing newlines/carriage returns will be cancelled and not sent. */
export const cancelMessageOnNewline = true;

// --- System ---

/** @type {string} The current version of the AntiCheat system. */
export const acVersion = "0.1.0-alpha";
