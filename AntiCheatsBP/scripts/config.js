// Anti-Cheat Configuration File

/** @type {string} Tag required for players to be recognized as administrators. */
export const ADMIN_TAG = "admin";

/** @type {boolean} If true, enables detailed console logging for debugging purposes. */
export const ENABLE_DEBUG_LOGGING = true;

/** @type {string} The prefix used for chat-based commands (e.g., "!ac version"). */
export const PREFIX = "!";

// --- General Check Toggles ---

/** @type {boolean} If true, the Reach check in combatChecks.js is active. */
export const ENABLE_REACH_CHECK = true;
/** @type {boolean} If true, the CPS (Clicks Per Second) check in combatChecks.js is active. */
export const ENABLE_CPS_CHECK = true;
/** @type {boolean} If true, the Fly check (both sustained and hover) in movementChecks.js is active. */
export const ENABLE_FLY_CHECK = true;
/** @type {boolean} If true, the Speed check in movementChecks.js is active. */
export const ENABLE_SPEED_CHECK = true;
/** @type {boolean} If true, the NoFall check in movementChecks.js is active. */
export const ENABLE_NOFALL_CHECK = true;
/** @type {boolean} If true, the Nuker check in worldChecks.js is active. */
export const ENABLE_NUKER_CHECK = true;
/** @type {boolean} If true, the Illegal Item check (both use and place) in worldChecks.js is active. */
export const ENABLE_ILLEGAL_ITEM_CHECK = true;


// --- Movement Checks ---

/**
 * @type {number}
 * Maximum vertical speed (intended interpretation: blocks per second, but actual check logic may vary).
 * Used in fly checks; exceeding this may flag players.
 * Note: Vanilla jump peak is ~0.42 m/tick or ~8.4 m/s if sustained, but this is for a single tick.
 * This value likely represents a threshold for sustained vertical movement over several ticks.
 */
export const MAX_VERTICAL_SPEED = 10;

/**
 * @type {number}
 * Maximum horizontal speed (intended interpretation: blocks per second).
 * Used in speed checks for players on the ground.
 * Default sprint speed is ~5.6 blocks/sec.
 */
export const MAX_HORIZONTAL_SPEED = 15;

/**
 * @type {number}
 * Flat bonus to maximum horizontal speed (blocks/sec) per level of the Speed effect.
 * E.g., Speed I (amplifier 0) adds (0+1)*SPEED_EFFECT_BONUS.
 */
export const SPEED_EFFECT_BONUS = 2.0;

/**
 * @type {number}
 * Minimum fall distance in blocks that is expected to cause fall damage to a player under normal conditions.
 */
export const MIN_FALL_DISTANCE_FOR_DAMAGE = 3.5;

/**
 * @type {number}
 * Threshold for vertical speed (blocks per tick, positive is upward) above which, if sustained, might indicate flying.
 * Note: Player's normal jump impulse gives a vertical speed of around 0.42.
 */
export const FLY_SUSTAINED_VERTICAL_SPEED_THRESHOLD = 0.5;

/**
 * @type {number}
 * Number of consecutive off-ground ticks, while exceeding `FLY_SUSTAINED_VERTICAL_SPEED_THRESHOLD`, to trigger a fly flag.
 */
export const FLY_SUSTAINED_OFF_GROUND_TICKS_THRESHOLD = 10;

/**
 * @type {number}
 * Minimum height in blocks above the last known ground position to be considered significantly "hovering" (as opposed to being near a ledge).
 */
export const FLY_HOVER_NEAR_GROUND_THRESHOLD = 3;

/**
 * @type {number}
 * Vertical speed (absolute value, blocks per tick) below which a player is considered to be hovering (if other conditions are met).
 */
export const FLY_HOVER_VERTICAL_SPEED_THRESHOLD = 0.08;

/**
 * @type {number}
 * Number of consecutive off-ground ticks, while meeting hover speed and height conditions, to trigger a hover flag.
 */
export const FLY_HOVER_OFF_GROUND_TICKS_THRESHOLD = 20;

/**
 * @type {number}
 * Maximum fall distance accumulated while hovering. If fall distance is below this (and other conditions met), it's more likely to be hover.
 */
export const FLY_HOVER_MAX_FALL_DISTANCE_THRESHOLD = 1.0;

/**
 * @type {number}
 * A tolerance buffer added to the maximum horizontal speed to account for minor variations and prevent false positives.
 */
export const SPEED_TOLERANCE_BUFFER = 0.5;

/**
 * @type {number}
 * Number of consecutive ticks a player must exceed the calculated maximum horizontal speed (including buffers and effects) while on ground to be flagged for speeding.
 */
export const SPEED_GROUND_CONSECUTIVE_TICKS_THRESHOLD = 5;


// --- Combat Checks ---

/**
 * @type {number}
 * Maximum clicks per second (CPS) threshold. Exceeding this may flag for auto-clicker.
 * CPS is calculated based on attack events (entity hurt by player).
 */
export const MAX_CPS_THRESHOLD = 20;

/**
 * @type {number}
 * Maximum reach distance in blocks for players in Survival or Adventure mode.
 * Measured from player's head (eye) location to the target entity's location.
 */
export const REACH_DISTANCE_SURVIVAL = 4.5;

/**
 * @type {number}
 * Maximum reach distance in blocks for players in Creative mode.
 * Measured from player's head (eye) location to the target entity's location.
 */
export const REACH_DISTANCE_CREATIVE = 6.0;

/**
 * @type {number}
 * A small buffer added to the maximum reach distance to allow for minor server/client discrepancies or precision issues.
 */
export const REACH_BUFFER = 0.5;

/**
 * @type {number}
 * Time window in milliseconds for calculating Clicks Per Second (CPS).
 * Attack events older than this window are filtered out.
 */
export const CPS_CALCULATION_WINDOW_MS = 1000;

// --- World Checks ---

/**
 * @type {number}
 * Maximum number of blocks a player can break within the `NUKER_CHECK_INTERVAL_MS` before being flagged for nuker.
 */
export const NUKER_MAX_BREAKS_SHORT_INTERVAL = 4;

/**
 * @type {number}
 * The time window in milliseconds used for the nuker check to count broken blocks.
 * (e.g., 200ms is approximately 4 game ticks at 20 TPS).
 */
export const NUKER_CHECK_INTERVAL_MS = 200;

/**
 * @type {string[]}
 * An array of item type IDs (e.g., "minecraft:command_block") that are banned from being placed.
 */
export const BANNED_ITEMS_PLACE: string[] = ["minecraft:command_block", "minecraft:moving_block"];

/**
 * @type {string[]}
 * An array of item type IDs that are banned from being used.
 * (Note: "Use" can mean right-clicking with the item in hand, not necessarily on a block).
 */
export const BANNED_ITEMS_USE: string[] = [];

// --- System ---

/** @type {string} The current version of the AntiCheat system. */
export const AC_VERSION = "0.1.0-alpha";
