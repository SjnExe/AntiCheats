// Anti-Cheat Configuration File

export const ADMIN_TAG = "admin"; // Tag required for admin privileges
export const ENABLE_DEBUG_LOGGING = true; // Enable detailed console logs for debugging
export const PREFIX = "!"; // Command prefix for anti-cheat commands

// Movement Checks
export const MAX_VERTICAL_SPEED = 10; // Example: Max speed upwards (blocks/sec) before flagging fly
export const MAX_HORIZONTAL_SPEED = 15; // Example: Max horizontal speed (blocks/sec) before flagging speed

// Combat Checks
export const MAX_CPS_THRESHOLD = 20; // Max clicks per second
export const REACH_DISTANCE_SURVIVAL = 4.5; // Max reach distance in survival
export const REACH_DISTANCE_CREATIVE = 6.0; // Max reach distance in creative

// World Checks
export const NUKER_BLOCKS_PER_TICK = 4; // Max blocks broken per tick before flagging nuker
export const BANNED_ITEMS_PLACE: string[] = ["minecraft:command_block", "minecraft:moving_block"];
export const BANNED_ITEMS_USE: string[] = [];

// Add more configuration options as needed
