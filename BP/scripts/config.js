// Anti-Cheat Configuration File

export const ADMIN_TAG = "admin"; // Tag required for admin privileges
export const ENABLE_DEBUG_LOGGING = true; // Enable detailed console logs for debugging
export const PREFIX = "!"; // Command prefix for anti-cheat commands

// Movement Checks
export const MAX_VERTICAL_SPEED = 10; // Example: Max speed upwards (blocks/sec) before flagging fly
export const MAX_HORIZONTAL_SPEED = 15; // Example: Max horizontal speed (blocks/sec) before flagging speed
export const SPEED_EFFECT_BONUS = 2.0; // Increase in m/s per speed effect level (vanilla speed I is +20%, II is +40%)
export const MIN_FALL_DISTANCE_FOR_DAMAGE = 3.5; // Min blocks fallen to expect vanilla fall damage

// Combat Checks
export const MAX_CPS_THRESHOLD = 20; // Max clicks per second
export const REACH_DISTANCE_SURVIVAL = 4.5; // Max reach distance in survival
export const REACH_DISTANCE_CREATIVE = 6.0; // Max reach distance in creative

// World Checks
// export const NUKER_BLOCKS_PER_TICK = 4; // Old - Max blocks broken per tick before flagging nuker
export const NUKER_MAX_BREAKS_SHORT_INTERVAL = 4; // Max blocks broken in NUKER_CHECK_INTERVAL_MS
export const NUKER_CHECK_INTERVAL_MS = 200;       // Time window in ms for the nuker check (approx. 4 game ticks)
export const BANNED_ITEMS_PLACE: string[] = ["minecraft:command_block", "minecraft:moving_block"];
export const BANNED_ITEMS_USE: string[] = [];

// Add more configuration options as needed
export const AC_VERSION = "0.1.0-alpha"; // AntiCheat Version
