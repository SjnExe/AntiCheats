// Anti-Cheat Configuration File
import { userSettings } from './userSettings.js';
import { checkActionProfiles } from '../core/actionProfiles.js';
import { automodConfig as importedAutoModConfig } from '../core/automodConfig.js';

/** @type {boolean} If true, the Automated Moderation system is active. */
export const enableAutoMod = false;

// --- General Check Toggles ---

/** @type {boolean} If true, the Reach check is active. */
export const enableReachCheck = true;
/** @type {boolean} If true, the CPS (Clicks Per Second) check is active. */
export const enableCPSCheck = true;
/** @type {boolean} If true, the View Snap / Invalid Pitch check is active. */
export const enableViewSnapCheck = true;
/** @type {boolean} If true, the Multi-Target Killaura check is active. */
export const enableMultiTargetCheck = true;
/** @type {boolean} If true, various state conflict checks (e.g., attack while sleeping) are active. */
export const enableStateConflictCheck = true;
/** @type {boolean} If true, the Fly check (both sustained and hover) is active. */
export const enableFlyCheck = false;
/** @type {boolean} If true, the Speed check is active. */
export const enableSpeedCheck = false;
/** @type {boolean} If true, the NoFall check is active. */
export const enableNofallCheck = true;
/** @type {boolean} If true, the Nuker check is active. */
export const enableNukerCheck = false;
/** @type {boolean} If true, the Illegal Item check (both use and place) is active. */
export const enableIllegalItemCheck = true;
/** @type {boolean} If true, the Self-Hurt Detection check is active. Detects suspicious self-inflicted damage. */
export const enableSelfHurtCheck = true;

/** @type {boolean} If true, the Nether Roof Check is active and will flag players found on the Nether roof. */
export const enableNetherRoofCheck = false;


// --- Movement Checks ---

/** @type {number} The Y-level at or above which a player in the Nether is considered to be on the roof. */
export const netherRoofYLevelThreshold = 128;

/** @type {number} Maximum vertical speed (positive for upward, negative for downward) in blocks per second. Used by Fly check. */
export const maxVerticalSpeed = 10;
/** @type {number} Maximum horizontal speed in blocks per second. Default vanilla sprint speed is ~5.6 blocks/sec. */
export const maxHorizontalSpeed = 15;
/** @type {number} Flat bonus to maximum horizontal speed (blocks/sec) added per level of the Speed effect. */
export const speedEffectBonus = 2.0;
/** @type {number} Minimum fall distance in blocks that is expected to cause fall damage. Used by NoFall check. */
export const minFallDistanceForDamage = 3.5;
/** @type {number} Threshold for vertical speed (blocks per tick, positive is upward) for sustained fly detection. */
export const flySustainedVerticalSpeedThreshold = 0.5;
/** @type {number} Number of consecutive off-ground ticks, while exceeding `flySustainedVerticalSpeedThreshold`, to trigger a fly flag. */
export const flySustainedOffGroundTicksThreshold = 10;
/** @type {number} Minimum height in blocks above the last known ground position for hover detection. */
export const flyHoverNearGroundThreshold = 3;
/** @type {number} Vertical speed (absolute value, blocks per tick) below which a player is considered hovering. */
export const flyHoverVerticalSpeedThreshold = 0.08;
/** @type {number} Number of consecutive off-ground ticks, while meeting hover conditions, to trigger a hover flag. */
export const flyHoverOffGroundTicksThreshold = 20;
/** @type {number} Maximum fall distance accumulated while hovering that will not be reset, to differentiate from actual falls. */
export const flyHoverMaxFallDistanceThreshold = 1.0;
/** @type {number} A tolerance buffer in blocks per second added to the maximum horizontal speed calculation. */
export const speedToleranceBuffer = 0.5;
/** @type {number} Number of consecutive ticks a player must exceed maximum horizontal speed on ground to be flagged by Speed check. */
export const speedGroundConsecutiveTicksThreshold = 5;

/** @type {boolean} If true, the NoSlow check (detecting movement speed reduction bypass) is active. */
export const enableNoSlowCheck = false;
/** @type {number} Maximum horizontal speed (blocks/sec) allowed while eating or drinking. Vanilla movement is significantly slowed. */
export const noSlowMaxSpeedEating = 1.0;
/** @type {number} Maximum horizontal speed (blocks/sec) allowed while charging a bow. Vanilla movement is significantly slowed. */
export const noSlowMaxSpeedChargingBow = 1.0;
/** @type {number} Maximum horizontal speed (blocks/sec) allowed while actively using/raising a shield. Vanilla walking speed is ~4.3 BPS; shield does not slow normal walking/sprinting. This value helps catch hacks if combined with other speed modifiers. */
export const noSlowMaxSpeedUsingShield = 4.4;
/** @type {number} Maximum horizontal speed (blocks/sec) allowed while sneaking. Vanilla sneaking speed is ~1.31 BPS. */
export const noSlowMaxSpeedSneaking = 1.5;

/** @type {boolean} If true, the Invalid Sprint check (detecting sprinting under disallowed conditions) is active. */
export const enableInvalidSprintCheck = true;


// --- Combat Checks ---

/** @type {number} Maximum clicks per second (CPS) threshold before flagging. */
export const maxCpsThreshold = 20;
/** @type {number} Maximum reach distance in blocks for Survival/Adventure mode players. */
export const reachDistanceSurvival = 4.5;
/** @type {number} Maximum reach distance in blocks for Creative mode players. */
export const reachDistanceCreative = 6.0;
/** @type {number} A small buffer in blocks added to maximum reach distance calculations to reduce false positives. */
export const reachBuffer = 0.5;
/** @type {number} Time window in milliseconds over which CPS is calculated. */
export const cpsCalculationWindowMs = 1000;

// --- View Snap / Invalid Pitch (Aimbot/Killaura components) ---
/** @type {number} Maximum degrees the player's pitch (up/down view angle) can change in a single game tick immediately after an attack. */
export const maxPitchSnapPerTick = 75;
/** @type {number} Maximum degrees the player's yaw (left/right view angle) can change in a single game tick immediately after an attack. */
export const maxYawSnapPerTick = 100;
/** @type {number} Number of game ticks after an attack during which view snaps (pitch/yaw changes) are monitored. */
export const viewSnapWindowTicks = 10;
/** @type {number} Minimum pitch value (degrees) considered invalid (e.g., looking impossibly far down). Vanilla range is -90 to 90. */
export const invalidPitchThresholdMin = -90.5;
/** @type {number} Maximum pitch value (degrees) considered invalid (e.g., looking impossibly far up). Vanilla range is -90 to 90. */
export const invalidPitchThresholdMax = 90.5;
/** @type {string} Reason message for flagging due to invalid pitch. */
export const flagReasonInvalidPitch = "Invalid Pitch";
/** @type {string} Reason message for flagging due to view snaps. */
export const flagReasonViewSnap = "View Snap";
/** @type {number} Increment value for flags related to view snap or invalid pitch. */
export const flagIncrementViewSnap = 1;

// --- Multi-Target Killaura ---
/** @type {number} Time window in milliseconds for detecting attacks on multiple distinct targets. */
export const multiTargetWindowMs = 1000;
/** @type {number} Number of distinct entities that must be hit within the `multiTargetWindowMs` to trigger a multi-target flag. */
export const multiTargetThreshold = 3;
/** @type {number} Maximum number of recent hit target records to store per player for multi-target analysis. */
export const multiTargetMaxHistory = 10;
/** @type {string} Reason message for flagging due to multi-target aura. */
export const flagReasonMultiAura = "Multi-Target Aura";

// --- State Conflict Checks (Killaura components) ---
/** @type {string} Reason message for flagging due to attacking while sleeping. */
export const flagReasonAttackWhileSleeping = "Attack While Sleeping";

/**
 * @type {string[]} Item type IDs for consumables (food, potions) that should prevent attacking while being actively used.
 * This helps detect cheats that allow attacking while eating/drinking.
 */
export const attackBlockingConsumables = [
    "minecraft:apple", "minecraft:golden_apple", "minecraft:enchanted_golden_apple",
    "minecraft:mushroom_stew", "minecraft:rabbit_stew", "minecraft:beetroot_soup",
    "minecraft:suspicious_stew", "minecraft:cooked_beef", "minecraft:cooked_porkchop",
    "minecraft:cooked_mutton", "minecraft:cooked_chicken", "minecraft:cooked_rabbit",
    "minecraft:cooked_salmon", "minecraft:cooked_cod", "minecraft:baked_potato",
    "minecraft:bread", "minecraft:melon_slice", "minecraft:carrot", "minecraft:potato",
    "minecraft:beetroot", "minecraft:dried_kelp", "minecraft:potion", "minecraft:honey_bottle"
];

/**
 * @type {string[]} Item type IDs for bows that should prevent attacking (other than firing the bow itself) while being charged.
 * This helps detect cheats that allow simultaneous melee attacks while drawing a bow.
 */
export const attackBlockingBows = ["minecraft:bow", "minecraft:crossbow"];

/**
 * @type {string[]} Item type IDs for shields that should prevent attacking while being actively used (raised).
 * This helps detect cheats that allow attacking while simultaneously blocking with a shield.
 */
export const attackBlockingShields = ["minecraft:shield"];

/** @type {number} Number of ticks an 'item use' state (e.g., `isUsingConsumable`) persists before auto-clearing if no explicit stop event. (20 ticks = 1 second). */
export const itemUseStateClearTicks = 60; // Default to 3 seconds


// --- World Checks ---

// --- AutoTool Check ---
/** @type {boolean} If true, the AutoTool check (detecting unnaturally fast tool switching for optimal block breaking) is active. */
export const enableAutoToolCheck = false;
/** @type {number} Maximum ticks between starting to break a block and switching to an optimal tool to be considered suspicious by AutoTool check. */
export const autoToolSwitchToOptimalWindowTicks = 2;
/** @type {number} Maximum ticks after breaking a block (with a switched optimal tool) to detect a switch back to a previous non-optimal tool, for AutoTool check. */
export const autoToolSwitchBackWindowTicks = 5;

// --- InstaBreak Check ---
/** @type {boolean} If true, the check for breaking normally unbreakable blocks (like Bedrock) is active. */
export const enableInstaBreakUnbreakableCheck = false;
/** @type {string[]} List of block type IDs considered normally unbreakable by non-Operator players. */
export const instaBreakUnbreakableBlocks = [
    "minecraft:bedrock", "minecraft:barrier", "minecraft:command_block",
    "minecraft:repeating_command_block", "minecraft:chain_command_block",
    "minecraft:structure_block", "minecraft:structure_void", "minecraft:jigsaw",
    "minecraft:light_block", "minecraft:end_portal_frame", "minecraft:end_gateway"
];
/** @type {boolean} If true, the check for breaking blocks significantly faster than vanilla capabilities is active. */
export const enableInstaBreakSpeedCheck = true;
/** @type {number} Tolerance in game ticks for block breaking speed. Actual break time must be less than (ExpectedTime - Tolerance) to flag. */
export const instaBreakTimeToleranceTicks = 2;

// --- Player Behavior Checks ---
/** @type {boolean} If true, the NameSpoof check (detecting invalid or rapidly changing player names) is active. */
export const enableNameSpoofCheck = true;
/** @type {number} Maximum allowed length for a player's nameTag. Used by NameSpoof check. */
export const nameSpoofMaxLength = 48;
/**
 * @type {string} Regular expression pattern for disallowed characters in player nameTags.
 * Aims to block control characters, newlines, and other potentially problematic symbols.
 */
export const nameSpoofDisallowedCharsRegex = "[\n\r\t\x00-\x1F\x7F-\x9F]";
/** @type {number} Minimum interval in game ticks between allowed player nameTag changes. Used by NameSpoof check. (200 ticks = 10 seconds) */
export const nameSpoofMinChangeIntervalTicks = 200;

/** @type {boolean} If true, the Anti-Gamemode Creative (Anti-GMC) check (detecting unauthorized Creative mode usage) is active. */
export const enableAntiGMCCheck = true;
/**
 * @type {string} The gamemode to switch players to if unauthorized Creative mode is detected and `antiGmcAutoSwitch` is true.
 * Valid values: "survival", "adventure", "spectator". Default: "survival".
 */
export const antiGMCSwitchToGameMode = "survival";
/** @type {boolean} If true, automatically switch a player's gamemode to `antiGMCSwitchToGameMode` if unauthorized Creative mode is detected. */
export const antiGmcAutoSwitch = true;

/** @type {boolean} If true, Inventory Modification checks (e.g., suspicious hotbar switching, using items from closed inventory) are active. */
export const enableInventoryModCheck = false;


/** @type {number} Maximum number of blocks that can be broken within `nukerCheckIntervalMs` before flagging for Nuker. */
export const nukerMaxBreaksShortInterval = 4;
/** @type {number} Time window in milliseconds for the Nuker check to count broken blocks. */
export const nukerCheckIntervalMs = 200;
/** @type {string[]} Array of item type IDs banned from being placed by players. */
export const bannedItemsPlace = ["minecraft:command_block", "minecraft:moving_block"];
/** @type {string[]} Array of item type IDs banned from being used by players. */
export const bannedItemsUse = [];

// --- Chat Checks ---

/** @type {boolean} If true, enables the Swear Word detection check. */
export const enableSwearCheck = false; // Disabled by default as per user request

/** @type {string[]} List of swear words to detect (case-insensitive, whole word). Empty by default. */
export const swearWordList = [];

/** @type {string} The action profile name for swear word violations. */
export const swearCheckActionProfileName = "chat_swear_violation";

/** @type {string} Duration for the mute applied on swear word detection. */
export const swearCheckMuteDuration = "30s";

/** @type {boolean} If true, the Fast Message Spam check is active. */
export const enableFastMessageSpamCheck = true;
/** @type {number} Minimum time in milliseconds that must pass between messages to avoid being considered spam. */
export const fastMessageSpamThresholdMs = 500;
/** @type {string} The action profile name (from `checkActionProfiles`) to use for fast message spam violations. */
export const fastMessageSPAMActionProfileName = "chat_spam_fast_message";

/** @type {boolean} If true, the Max Words Spam check (preventing overly long messages) is active. */
export const enableMaxWordsSpamCheck = true;
/** @type {number} Maximum allowed number of words in a single chat message. */
export const maxWordsSpamThreshold = 50;
/** @type {string} The action profile name (from `checkActionProfiles`) to use for max words spam violations. */
export const maxWordsSPAMActionProfileName = "chat_spam_max_words";

/** @type {boolean} If true, checks for newline or carriage return characters in chat messages. */
export const enableNewlineCheck = true;
/** @type {boolean} If true, sending a message containing newlines/carriage returns will flag the player. */
export const flagOnNewline = true;
/** @type {boolean} If true, messages containing newlines/carriage returns will be cancelled and not sent. */
export const cancelMessageOnNewline = true;
/** @type {boolean} If true, checks if chat messages exceed the `maxMessageLength`. */
export const enableMaxMessageLengthCheck = true;
/** @type {number} Maximum allowed character length for a single chat message. */
export const maxMessageLength = 256;
/** @type {boolean} If true, sending a message exceeding `maxMessageLength` will flag the player. */
export const flagOnMaxMessageLength = true;
/** @type {boolean} If true, messages exceeding `maxMessageLength` will be cancelled. */
export const cancelOnMaxMessageLength = true;
/** @type {boolean} If true, checks for players sending the same or very similar messages repeatedly. */
export const spamRepeatCheckEnabled = true;
/** @type {number} Number of identical or similar messages within `spamRepeatTimeWindowSeconds` to trigger a spam flag. */
export const spamRepeatMessageCount = 3;
/** @type {number} Time window in seconds to monitor for repeated messages. */
export const spamRepeatTimeWindowSeconds = 5;
/** @type {boolean} If true, flags the player for repeated message spam. */
export const spamRepeatFlagPlayer = true;
/** @type {boolean} If true, cancels the message that triggers repeated spam detection. */
export const spamRepeatCancelMessage = false;

// --- Scaffold/Tower Detection ---
/** @type {boolean} If true, the Scaffold/Tower (detecting rapid upward block placement) check is active. */
export const enableTowerCheck = false;
/** @type {number} Maximum time in game ticks between consecutive upward pillar blocks for them to be considered part of the same tower structure. */
export const towerMaxTickGap = 10; // 0.5 seconds
/** @type {number} Minimum number of consecutive upward blocks placed to trigger a tower flag. */
export const towerMinHeight = 5;
/** @type {number} Maximum pitch deviation (degrees) allowed while pillaring up. Player's pitch must be less than this (e.g., looking further down than -30 degrees). */
export const towerMaxPitchWhilePillaring = -30;
/** @type {number} How many recent block placements to store for pattern analysis in tower/scaffold checks. */
export const towerPlacementHistoryLength = 20;

/** @type {boolean} If true, the Flat/Invalid Rotation While Building check (detecting unnatural head movements during placement) is active. */
export const enableFlatRotationCheck = false;
/** @type {number} Number of consecutive block placements to analyze for static or flat rotation patterns. */
export const flatRotationConsecutiveBlocks = 4;
/** @type {number} Maximum degrees of variance allowed for pitch over `flatRotationConsecutiveBlocks` to be considered 'static'. */
export const flatRotationMaxPitchVariance = 2.0;
/** @type {number} Maximum degrees of variance allowed for yaw over `flatRotationConsecutiveBlocks` to be considered 'static'. */
export const flatRotationMaxYawVariance = 2.0;
/** @type {number} Minimum pitch for 'flat horizontal' building detection (e.g., looking straight ahead). */
export const flatRotationPitchHorizontalMin = -5.0;
/** @type {number} Maximum pitch for 'flat horizontal' building detection. */
export const flatRotationPitchHorizontalMax = 5.0;
/** @type {number} Minimum pitch for 'flat downward' building detection (e.g., looking straight down). */
export const flatRotationPitchDownwardMin = -90.0;
/** @type {number} Maximum pitch for 'flat downward' building detection. */
export const flatRotationPitchDownwardMax = -85.0;

/** @type {boolean} If true, the Downward Scaffold check (detecting rapid downward block placement while airborne) is active. */
export const enableDownwardScaffoldCheck = false;
/** @type {number} Minimum number of consecutive downward blocks placed while airborne to trigger a downward scaffold flag. */
export const downwardScaffoldMinBlocks = 3;
/** @type {number} Maximum time in game ticks between consecutive downward scaffold blocks. */
export const downwardScaffoldMaxTickGap = 10; // 0.5 seconds
/** @type {number} Minimum horizontal speed (blocks/sec) player must maintain while downward scaffolding to be flagged. Vanilla players usually slow significantly. */
export const downwardScaffoldMinHorizontalSpeed = 3.0;

/** @type {boolean} If true, the check for Placing Blocks onto Air/Liquid without adjacent support is active. */
export const enableAirPlaceCheck = false;
/**
 * @type {string[]} List of block type IDs that are considered 'solid' and typically require support.
 * Placing these against air or liquid without other solid adjacent support may be flagged.
 */
export const airPlaceSolidBlocks = [
    "minecraft:cobblestone", "minecraft:stone", "minecraft:dirt", "minecraft:grass_block",
    "minecraft:oak_planks", "minecraft:spruce_planks", "minecraft:birch_planks",
    "minecraft:jungle_planks", "minecraft:acacia_planks", "minecraft:dark_oak_planks",
    "minecraft:crimson_planks", "minecraft:warped_planks", "minecraft:sand", "minecraft:gravel",
    "minecraft:obsidian", "minecraft:netherrack", "minecraft:end_stone"
];

// --- Fast Use/Place Checks ---
/** @type {boolean} If true, the Fast Item Use check (detecting usage faster than vanilla cooldowns) is active. */
export const enableFastUseCheck = true;
/**
 * @type {Object.<string, number>} Defines minimum cooldown in milliseconds between uses for specific items.
 * Keys are item type IDs (e.g., "minecraft:ender_pearl"), values are cooldown times.
 */
export const fastUseItemCooldowns = {
    "minecraft:ender_pearl": 1000,
    "minecraft:snowball": 150,
    "minecraft:egg": 150,
    "minecraft:bow": 200, // Min time for consecutive separate bow uses, not charge time.
    "minecraft:crossbow": 1250,
    "minecraft:potion": 800,
    "minecraft:splash_potion": 500,
    "minecraft:lingering_potion": 500,
    "minecraft:chorus_fruit": 800,
    "minecraft:shield": 500 // Cooldown for re-raising shield after being hit or lowered.
};

/** @type {boolean} If true, the Fast Block Place check is active. */
export const enableFastPlaceCheck = false;
/** @type {number} Time window in milliseconds for fast block placement detection. */
export const fastPlaceTimeWindowMs = 1000; // 1 second
/** @type {number} Maximum number of blocks allowed to be placed within `fastPlaceTimeWindowMs`. */
export const fastPlaceMaxBlocksInWindow = 10;

// --- X-Ray Detection ---
/** @type {boolean} If true, enables admin notifications for mining of valuable ores (as defined in `xrayDetectionMonitoredOres`). */
export const xrayDetectionNotifyOnOreMineEnabled = true;
/** @type {string[]} List of block type IDs to monitor for X-Ray mining notifications. */
export const xrayDetectionMonitoredOres = [
    "minecraft:diamond_ore", "minecraft:deepslate_diamond_ore", "minecraft:ancient_debris"
];
/** @type {boolean} If true, admins (users with `adminTag`) will receive X-Ray mining notifications by default, unless they explicitly disable them. */
export const xrayDetectionAdminNotifyByDefault = true;

// --- Combat Log Detection ---
/** @type {boolean} If true, enables detection of players leaving the game shortly after engaging in combat. */
export const acGlobalNotificationsDefaultOn = true;

// --- Death Effects ---
/** @type {boolean} If true, cosmetic effects (particle and sound) are shown when a player dies. */
export const enableDeathEffects = false;
/** @type {string} The particle effect name to spawn when a player dies. Example: "minecraft:totem_particle". */
export const deathEffectParticleName = "minecraft:totem_particle";
/** @type {string} The sound ID to play when a player dies. Example: "mob.ghast.scream". */
export const deathEffectSoundId = "mob.ghast.scream";
/**
 * @type {object} Defines the default cosmetic effect shown when a player dies (legacy, can be removed if particleName/soundId are preferred).
 * @property {string} soundId - The sound ID to play on player death (e.g., "ambient.weather.lightning.impact").
 * @property {string} particleCommand - The command to execute for spawning particles (e.g., "particle minecraft:large_explosion ~ ~1 ~"). Location placeholders (~ ~ ~) are relative to the death location.
 * @property {object} soundOptions - Options for the sound playback.
 * @property {number} soundOptions.volume - Volume of the sound (e.g., 1.0).
 * @property {number} soundOptions.pitch - Pitch of the sound (e.g., 1.0).
 */
export const defaultDeathEffect = {
    soundId: "ambient.weather.lightning.impact", // This will be overridden by deathEffectSoundId if it's set
    particleCommand: "particle minecraft:large_explosion ~ ~1 ~", // This will be overridden by deathEffectParticleName if it's set
    soundOptions: {
        volume: 1.0,
        pitch: 0.8
    }
};

// --- TPA System Settings ---
/**
 * @type {boolean}
 * Enable or disable the player TPA (teleport request) system.
 * If false, TPA commands will not be usable.
 */
// Anti-Grief Settings
/** @type {number} Radius for the density check cube (e.g., 1 means 3x3x3 cube). */
export const blockSpamDensityCheckRadius = 1;
/** @type {number} Time window in ticks to consider recent blocks for density calculation. */
export const blockSpamDensityTimeWindowTicks = 60; // 3 seconds
/** @type {number} Percentage of volume filled by player's recent blocks to trigger detection. */
export const blockSpamDensityThresholdPercentage = 70;

// --- Client Behavior Checks ---
/** @type {boolean} If true, the Invalid Render Distance check is active. */
export const enableInvalidRenderDistanceCheck = true;
/** @type {number} Maximum allowed client-reported render distance in chunks. */
export const maxAllowedClientRenderDistance = 64;

// --- World Border System --- (Already existing section, adding more to it)
/** @type {boolean} Master switch for the entire World Border feature. */
// --- Chat Behavior Checks ---
/** @type {boolean} If true, the Chat During Combat check is active. */
export const enableChatDuringCombatCheck = true;
/** @type {number} Seconds after the last combat interaction during which a player cannot chat. */
export const chatDuringCombatCooldownSeconds = 4;
/** @type {boolean} If true, the Chat During Item Use check is active. */
export const enableChatDuringItemUseCheck = true;

// --- Chat Formatting Settings ---
/** @type {string} Default color for the Owner rank's chat prefix. */
// --- System ---
/**
 * @type {string}
 * The current version of the AntiCheat system.
 * (This might be updated by a build process or during packaging).
 */
export const acVersion = "v__VERSION_STRING__";

/**
 * @typedef {object} AutoModRuleParameter
 * @property {string} reasonKey - Key to look up the message in `automodActionMessages`.
 * @property {string} [duration] - Duration for actions like TEMP_BAN or MUTE (e.g., "5m", "1h").
 * @property {string} [itemToRemoveTypeId] - Specific item TypeId for REMOVE_ILLEGAL_ITEM action.
 */

/**
 * @typedef {object} AutoModRule
 * @property {number} flagThreshold - Number of flags of a specific checkType to trigger this rule.
 * @property {string} actionType - Type of action (e.g., "WARN", "KICK", "TEMP_BAN", "MUTE", "REMOVE_ILLEGAL_ITEM", "FLAG_ONLY").
 * @property {AutoModRuleParameter} parameters - Parameters for the action.
 * @property {boolean} resetFlagsAfterAction - Whether to reset the flag count for this checkType after the action.
 */

/**
 * Configuration for the AutoMod system.
 * Defines rules for automated actions based on flag counts, messages for those actions,
 * and per-check type toggles for AutoMod.
 * @type {{
 *   automodRules: Object.<string, AutoModRule[]>,
 *   automodActionMessages: Object.<string, string>,
 *   automodPerCheckTypeToggles: Object.<string, boolean>
// NOTE: The original `automodConfig` constant definition has been moved to `AntiCheatsBP/scripts/core/automodConfig.js`.
// It will be imported and included in `editableConfigValues`.
// For clarity, we can alias the import if needed, or use it directly.
// For instance, if `automodConfig` is already used as a local variable name later,
// aliasing the import like `importedAutoModConfig` can prevent naming conflicts.
// However, since `editableConfigValues` is the main export for runtime values,
// we will just assign the imported `automodConfig` to a key within it.

// Placeholder for where automodConfig was, to be clear it's removed from here.
// export const automodConfig = { /* ...definition moved... */ };

// --- Command Aliases ---
/**
 * @type {Object.<string, string>}
 * Defines aliases for commands. Keys are the alias, values are the full command name.
 * This allows for shorter command inputs.
 * Example: { "v": "version", "i": "inspect" }
 */
export const commandAliases = {
    "v": "version", "w": "watch", "i": "inspect", "rf": "resetflags",
    "xn": "xraynotify", "mf": "myflags", "notifications": "notify",
    "ui": "panel", "cw": "clearwarnings"
};

// --- Editable Configuration ---
/**
 * @type {object}
 * Holds the current, potentially runtime-modified, values of configurations.
 * This object is initialized with values from the exported constants at startup.
 * Use `updateConfigValue(key, newValue)` to modify these values safely.
 */
export let editableConfigValues = {
    ...userSettings, // Load all defaults from user_settings.js

    // Settings NOT in user_settings.js but still part of editableConfigValues:
    enableAutoMod,
    enableReachCheck,
    enableCPSCheck,
    enableViewSnapCheck,
    enableMultiTargetCheck,
    enableStateConflictCheck,
    enableFlyCheck,
    enableSpeedCheck,
    enableNofallCheck,
    enableNukerCheck,
    enableIllegalItemCheck,
    enableSelfHurtCheck,
    enableNetherRoofCheck,
    enableAutoToolCheck,
    autoToolSwitchToOptimalWindowTicks,
    autoToolSwitchBackWindowTicks,
    enableInstaBreakUnbreakableCheck,
    instaBreakUnbreakableBlocks,
    enableInstaBreakSpeedCheck,
    instaBreakTimeToleranceTicks,
    enableNameSpoofCheck,
    nameSpoofMaxLength,
    nameSpoofDisallowedCharsRegex,
    nameSpoofMinChangeIntervalTicks,
    enableAntiGMCCheck,
    antiGMCSwitchToGameMode,
    antiGmcAutoSwitch,
    enableInventoryModCheck,
    enableNoSlowCheck,
    noSlowMaxSpeedEating,
    noSlowMaxSpeedChargingBow,
    noSlowMaxSpeedUsingShield,
    noSlowMaxSpeedSneaking,
    enableInvalidSprintCheck,
    attackBlockingConsumables,
    attackBlockingBows,
    attackBlockingShields,
    itemUseStateClearTicks,
    maxVerticalSpeed,
    maxHorizontalSpeed,
    speedEffectBonus,
    minFallDistanceForDamage,
    flySustainedVerticalSpeedThreshold,
    flySustainedOffGroundTicksThreshold,
    flyHoverNearGroundThreshold,
    flyHoverVerticalSpeedThreshold,
    flyHoverOffGroundTicksThreshold,
    flyHoverMaxFallDistanceThreshold,
    speedToleranceBuffer,
    speedGroundConsecutiveTicksThreshold,
    netherRoofYLevelThreshold,
    maxCpsThreshold,
    reachDistanceSurvival,
    reachDistanceCreative,
    reachBuffer,
    cpsCalculationWindowMs,
    maxPitchSnapPerTick,
    maxYawSnapPerTick,
    viewSnapWindowTicks,
    invalidPitchThresholdMin,
    invalidPitchThresholdMax,
    multiTargetWindowMs,
    multiTargetThreshold,
    multiTargetMaxHistory,
    nukerMaxBreaksShortInterval,
    nukerCheckIntervalMs,
    enableNewlineCheck,
    flagOnNewline,
    cancelMessageOnNewline,
    enableMaxMessageLengthCheck,
    maxMessageLength,
    flagOnMaxMessageLength,
    cancelOnMaxMessageLength,
    spamRepeatCheckEnabled,
    spamRepeatMessageCount,
    spamRepeatTimeWindowSeconds,
    spamRepeatFlagPlayer,
    spamRepeatCancelMessage,
    enableFastMessageSpamCheck,
    fastMessageSpamThresholdMs,
    fastMessageSPAMActionProfileName,
    enableMaxWordsSpamCheck,
    maxWordsSpamThreshold,
    maxWordsSPAMActionProfileName,
    enableTowerCheck,
    towerMaxTickGap,
    towerMinHeight,
    towerMaxPitchWhilePillaring,
    towerPlacementHistoryLength,
    enableFlatRotationCheck,
    flatRotationConsecutiveBlocks,
    flatRotationMaxPitchVariance,
    flatRotationMaxYawVariance,
    flatRotationPitchHorizontalMin,
    flatRotationPitchHorizontalMax,
    flatRotationPitchDownwardMin,
    flatRotationPitchDownwardMax,
    enableDownwardScaffoldCheck,
    downwardScaffoldMinBlocks,
    downwardScaffoldMaxTickGap,
    downwardScaffoldMinHorizontalSpeed,
    enableAirPlaceCheck,
    airPlaceSolidBlocks,
    enableFastUseCheck,
    fastUseItemCooldowns,
    enableFastPlaceCheck,
    fastPlaceTimeWindowMs,
    fastPlaceMaxBlocksInWindow,
    acGlobalNotificationsDefaultOn,
    enableDeathEffects, // This was in user_settings.js, but defaultDeathEffect is not, so keeping enableDeathEffects here too for the object below.
    deathEffectParticleName, // This was in user_settings.js, but defaultDeathEffect is not.
    deathEffectSoundId, // This was in user_settings.js, but defaultDeathEffect is not.
    defaultDeathEffect,
    // AntiGrief specific settings not in user_settings.js
    maxPlayerStartedFires,
    fireSpreadDurationLimit,
    blockSpamDensityCheckRadius, // This was NOT in user_settings.js
    blockSpamDensityTimeWindowTicks, // This was NOT in user_settings.js
    blockSpamDensityThresholdPercentage, // This was NOT in user_settings.js
    // Client Behavior Checks not in user_settings.js
    maxAllowedClientRenderDistance,
    // Chat Behavior Checks not in user_settings.js
    enableChatDuringCombatCheck,
    chatDuringCombatCooldownSeconds,
    enableChatDuringItemUseCheck,
    // Swear Check specific (action profile name is advanced)
    swearCheckActionProfileName, // swearCheckMuteDuration is in user_settings
    // AutoMod Configuration (complex object, now imported)
    automodConfig: importedAutoModConfig,
    // Imported Action Profiles
    checkActionProfiles,
};

/**
 * Updates a configuration value in the `editableConfigValues` object in memory.
 * This function performs type checking and coercion for numbers from strings.
 *
 * @param {string} key The configuration key (property name in `editableConfigValues`) to update.
 * @param {boolean|string|number|string[]} newValue The new value for the configuration. Note that for array types, this replaces the entire array.
 * @returns {boolean} True if the update was successful and the value changed, false otherwise (e.g., key not found, type mismatch, or new value is same as old).
 */
export function updateConfigValue(key, newValue) {
    if (!editableConfigValues.hasOwnProperty(key)) {
        console.warn(`[ConfigManager] Attempted to update non-existent config key: ${key}`);
        return false;
    }

    const oldValue = editableConfigValues[key];
    const originalType = typeof oldValue;
    let coercedNewValue = newValue;

    if (originalType === 'number' && typeof newValue === 'string') {
        const parsedNum = Number(newValue);
        if (isNaN(parsedNum)) {
            console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected number, got unparsable string "${newValue}". Update rejected.`);
            return false;
        }
        coercedNewValue = parsedNum;
    } else if (originalType === 'boolean' && typeof newValue === 'string') {
        if (newValue.toLowerCase() === 'true') {
            coercedNewValue = true;
        } else if (newValue.toLowerCase() === 'false') {
            coercedNewValue = false;
        } else {
            console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected boolean, got unparsable string "${newValue}" for boolean. Update rejected.`);
            return false;
        }
    } else if (Array.isArray(oldValue) && typeof newValue === 'string') {
        // Special handling for stringified arrays for config editing, if needed.
        // For now, assume arrays are passed as actual arrays.
        // If string input for arrays is a requirement from UI:
        // try {
        //     const parsedArray = JSON.parse(newValue);
        //     if (!Array.isArray(parsedArray)) {
        //         console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected array, got non-array JSON string "${newValue}". Update rejected.`);
        //         return false;
        //     }
        //     coercedNewValue = parsedArray;
        // } catch (e) {
        //     console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected array, got unparsable JSON string "${newValue}". Update rejected.`);
        //     return false;
        // }
        console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected array, got string. Update rejected.`);
        return false;
    }
     else if (typeof oldValue !== typeof coercedNewValue && !Array.isArray(oldValue)) { // Allow assigning new array to array type
        console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected ${originalType}, got ${typeof coercedNewValue}. Update rejected.`);
        return false;
    }


    // For arrays and objects, a simple comparison checks reference, not content.
    // For this application, if new and old value are "equal" by strict comparison, consider it unchanged.
    // Deep equality check for objects/arrays could be added if needed but adds complexity.
    if (oldValue === coercedNewValue && !Array.isArray(coercedNewValue)) { // For non-arrays, strict equality is fine
        if (enableDebugLogging) console.log(`[ConfigManager] No change for ${key}, value is already ${coercedNewValue}`);
        return false;
    }
    // For arrays, compare JSON strings to check for content equality
    if (Array.isArray(oldValue) && Array.isArray(coercedNewValue) && JSON.stringify(oldValue) === JSON.stringify(coercedNewValue)) {
        if (enableDebugLogging) console.log(`[ConfigManager] No change for array ${key}, value is already ${JSON.stringify(coercedNewValue)}`);
        return false;
    }


    editableConfigValues[key] = coercedNewValue;
    if (enableDebugLogging) console.log(`[ConfigManager] Updated ${key} from "${Array.isArray(oldValue) ? JSON.stringify(oldValue) : oldValue}" to "${Array.isArray(coercedNewValue) ? JSON.stringify(coercedNewValue) : coercedNewValue}"`);
    return true;
}
