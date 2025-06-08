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

/** @type {boolean} If true, the Automated Moderation system is active. */
export const enableAutoMod = true;

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
/** @type {boolean} If true, the Self-Hurt Detection check is active. Detects suspicious self-inflicted damage. */
export const enableSelfHurtCheck = true;


// --- Movement Checks ---

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
export const enableNoSlowCheck = true;
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
export const enableAutoToolCheck = true;
/** @type {number} Maximum ticks between starting to break a block and switching to an optimal tool to be considered suspicious by AutoTool check. */
export const autoToolSwitchToOptimalWindowTicks = 2;
/** @type {number} Maximum ticks after breaking a block (with a switched optimal tool) to detect a switch back to a previous non-optimal tool, for AutoTool check. */
export const autoToolSwitchBackWindowTicks = 5;

// --- InstaBreak Check ---
/** @type {boolean} If true, the check for breaking normally unbreakable blocks (like Bedrock) is active. */
export const enableInstaBreakUnbreakableCheck = true;
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
export const enableAntiGmcCheck = true;
/**
 * @type {string} The gamemode to switch players to if unauthorized Creative mode is detected and `antiGmcAutoSwitch` is true.
 * Valid values: "survival", "adventure", "spectator". Default: "survival".
 */
export const antiGmcSwitchToGameMode = "survival";
/** @type {boolean} If true, automatically switch a player's gamemode to `antiGmcSwitchToGameMode` if unauthorized Creative mode is detected. */
export const antiGmcAutoSwitch = true;

/** @type {boolean} If true, Inventory Modification checks (e.g., suspicious hotbar switching, using items from closed inventory) are active. */
export const enableInventoryModCheck = true;


/** @type {number} Maximum number of blocks that can be broken within `nukerCheckIntervalMs` before flagging for Nuker. */
export const nukerMaxBreaksShortInterval = 4;
/** @type {number} Time window in milliseconds for the Nuker check to count broken blocks. */
export const nukerCheckIntervalMs = 200;
/** @type {string[]} Array of item type IDs banned from being placed by players. */
export const bannedItemsPlace = ["minecraft:command_block", "minecraft:moving_block"];
/** @type {string[]} Array of item type IDs banned from being used by players. */
export const bannedItemsUse = [];

// --- Chat Checks ---
/** @type {boolean} If true, the Fast Message Spam check is active. */
export const enableFastMessageSpamCheck = true;
/** @type {number} Minimum time in milliseconds that must pass between messages to avoid being considered spam. */
export const fastMessageSpamThresholdMs = 500;
/** @type {string} The action profile name (from `checkActionProfiles`) to use for fast message spam violations. */
export const fastMessageSpamActionProfileName = "chat_spam_fast_message";

/** @type {boolean} If true, the Max Words Spam check (preventing overly long messages) is active. */
export const enableMaxWordsSpamCheck = true;
/** @type {number} Maximum allowed number of words in a single chat message. */
export const maxWordsSpamThreshold = 50;
/** @type {string} The action profile name (from `checkActionProfiles`) to use for max words spam violations. */
export const maxWordsSpamActionProfileName = "chat_spam_max_words";

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
export const enableTowerCheck = true;
/** @type {number} Maximum time in game ticks between consecutive upward pillar blocks for them to be considered part of the same tower structure. */
export const towerMaxTickGap = 10; // 0.5 seconds
/** @type {number} Minimum number of consecutive upward blocks placed to trigger a tower flag. */
export const towerMinHeight = 5;
/** @type {number} Maximum pitch deviation (degrees) allowed while pillaring up. Player's pitch must be less than this (e.g., looking further down than -30 degrees). */
export const towerMaxPitchWhilePillaring = -30;
/** @type {number} How many recent block placements to store for pattern analysis in tower/scaffold checks. */
export const towerPlacementHistoryLength = 20;

/** @type {boolean} If true, the Flat/Invalid Rotation While Building check (detecting unnatural head movements during placement) is active. */
export const enableFlatRotationCheck = true;
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
export const enableDownwardScaffoldCheck = true;
/** @type {number} Minimum number of consecutive downward blocks placed while airborne to trigger a downward scaffold flag. */
export const downwardScaffoldMinBlocks = 3;
/** @type {number} Maximum time in game ticks between consecutive downward scaffold blocks. */
export const downwardScaffoldMaxTickGap = 10; // 0.5 seconds
/** @type {number} Minimum horizontal speed (blocks/sec) player must maintain while downward scaffolding to be flagged. Vanilla players usually slow significantly. */
export const downwardScaffoldMinHorizontalSpeed = 3.0;

/** @type {boolean} If true, the check for Placing Blocks onto Air/Liquid without adjacent support is active. */
export const enableAirPlaceCheck = true;
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
export const enableFastPlaceCheck = true;
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
export const enableCombatLogDetection = false; // Defaulted to false as it can have false positives.
/** @type {number} Time in seconds after the last combat interaction. If a player disconnects within this period, it's considered combat logging. */
export const combatLogThresholdSeconds = 15;
/** @type {number} Number of flags to add to a player's record when combat logging is detected. */
export const combatLogFlagIncrement = 1;
/** @type {string} Default reason message for combat log flags. */
export const combatLogReason = "Disconnected shortly after combat.";
/**
 * @type {string} Template for admin notification message for combat logging.
 * Placeholders: {playerName}, {timeSinceCombat}, {incrementAmount}.
 */
export const combatLogMessage = "§cCombat Log: {playerName} disconnected {timeSinceCombat}s after combat. Flagged +{incrementAmount}.";


/** @type {boolean} If true, admins receive all AntiCheat notifications by default, unless individually overridden by specific check settings or admin preferences. */
export const acGlobalNotificationsDefaultOn = true;

// --- Welcomer Message ---
/** @type {boolean} If true, a welcome message is sent to players on their first join. */
export const enableWelcomerMessage = true;
/**
 * @type {string} The welcome message template. Use {playerName} as a placeholder for the player's name.
 * Example: "Welcome, {playerName}, to the server! Enjoy your stay."
 */
export const welcomeMessage = "Welcome, {playerName}, to our amazing server! We're glad to have you.";
/** @type {boolean} If true, admins will be notified when a new player joins for the first time. */
export const notifyAdminOnNewPlayerJoin = true;

// --- Death Coords ---
/** @type {boolean} If true, a message with death coordinates is shown to players upon respawn. */
export const enableDeathCoordsMessage = true;
/**
 * @type {string} The death coordinates message template.
 * Placeholders: {x}, {y}, {z}, {dimensionId}.
 * Example: "§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}."
 */
export const deathCoordsMessage = "§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.";

// --- TPA System Settings ---
/**
 * @type {boolean}
 * Enable or disable the player TPA (teleport request) system.
 * If false, TPA commands will not be usable.
 */
export const enableTpaSystem = false;

/**
 * @type {number}
 * How long (in seconds) a TPA request remains valid before automatically declining.
 */
export const tpaRequestTimeoutSeconds = 60;

/**
 * @type {number}
 * Cooldown in seconds a player must wait after sending a TPA/TPAHere request before sending another.
 */
export const tpaRequestCooldownSeconds = 10;

/** @type {number} Duration in seconds a player must wait (warm-up) before teleportation occurs after a TPA request is accepted. Taking damage during warm-up cancels the teleport. */
export const tpaTeleportWarmupSeconds = 10;

// --- UI Display Texts ---
/**
 * @type {string}
 * Defines the server rules to be displayed in the UI (e.g., via !uinfo command).
 * Use newline characters `\n` for line breaks.
 * This is a single string to allow easier editing via in-game commands if such a feature is added.
 */
export const serverRules = "1. Be respectful to all players and staff.\n2. No X-Ray or resource exploitation cheats.\n3. No hacking, combat advantages, or unfair modifications.\n4. No item duplication or exploiting game bugs for personal gain.\n5. Keep chat respectful and constructive.";

/**
 * @type {string}
 * Defines the Discord server invite link. Displayed in the UI.
 * Example: "https://discord.gg/YourInviteCode"
 */
export const discordLink = "https://discord.gg/example";

/**
 * @type {string}
 * Defines the server's website or forum link. Displayed in the UI.
 * Example: "https://yourserver.com"
 */
export const websiteLink = "https://example.com";

/** @type {{title: string, url: string}[]} Defines additional links to be displayed in the Help & Links UI section. */
export const helpLinks = [
    { title: "Our Discord Server", url: "https://discord.gg/YourInviteCode" },
    { title: "Website/Forums", url: "https://yourwebsite.com/forums" },
    { title: "Report a Player", url: "https://yourwebsite.com/report" }
];
/** @type {string[]} General help messages or tips to display in the UI (e.g., in a general info panel). */
export const generalHelpMessages = [
    "Welcome to the server! We hope you have a great time.",
    "For a list of commands, type !help in chat.",
    "If you suspect a player of cheating, please use the report link or contact staff.",
    "Please be familiar with our server rules, available via !uinfo."
];

// --- System ---
/**
 * @type {string}
 * The current version of the AntiCheat system.
 * (This might be updated by a build process or during packaging).
 */
export const acVersion = "v__VERSION_STRING__";

// --- Check Action Profiles ---
// Defines actions to be taken for specific cheat detections.
// Used by actionManager.js.
//
// Structure for each profile:
// "profile_key_string": { // Typically 'checkCategory_checkName' or similar unique identifier
//   enabled: boolean,           // Master switch for actions of this profile
//   flag: {
//     increment: number,        // How many times to call addFlag
//     reason: string,           // Reason for the flag. Placeholders: {playerName}, {checkType}, {detailsString}, {violationDetailKey}
//     type?: string             // Optional: specific flag type for playerData (e.g., "fly", "speed"). Defaults to profile_key_string if not provided.
//   },
//   notifyAdmins: {
//     message: string           // Message template for admin notifications. Uses same placeholders.
//   },
//   log: {
//     actionType?: string,      // Optional: specific actionType for logManager. Defaults to 'detected_profile_key_string'.
//     detailsPrefix?: string,   // Optional: prefix for the log details string.
//     includeViolationDetails?: boolean // Optional: if false, {detailsString} might not be fully populated in logs/notifications. Defaults to true.
//   },
//   cancelMessage?: boolean     // Optional (for chat checks): if true, cancels the offending chat message.
//   // Future actions like 'kickPlayer', 'banPlayer', 'runCommand' could be added here.
// }

export const checkActionProfiles = {
    "example_fly_hover": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected Fly (Hover).",
            type: "fly"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Fly (Hover). Details: {detailsString}"
        },
        log: {
            actionType: "detected_fly_hover",
            detailsPrefix: "Fly (Hover Violation): "
        }
    },
    "example_speed_ground": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected excessive ground speed.",
            type: "speed"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Speed (Ground). Speed: {speedBps} BPS (Max: {maxAllowedBps})"
        },
        log: {
            actionType: "detected_speed_ground",
            detailsPrefix: "Speed (Ground Violation): "
        }
    },
    "example_reach_attack": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected excessive reach during combat.",
            type: "reach"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Reach. Distance: {actualDistance} (Max: {allowedDistance})"
        },
        log: {
            actionType: "detected_reach_attack",
            detailsPrefix: "Reach (Attack Violation): "
        }
    },
    "movement_nofall": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected suspicious fall damage negation (NoFall).",
            type: "movement_violation"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for NoFall. Fall Distance: {fallDistance}m. Details: {detailsString}"
        },
        log: {
            actionType: "detected_movement_nofall",
            detailsPrefix: "NoFall Violation: "
        }
    },
    "world_nuker": {
        enabled: true,
        flag: {
            increment: 5,
            reason: "System detected Nuker activity (rapid/wide-area block breaking).",
            type: "world_violation"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Nuker. Blocks: {blocksBroken} in window. Details: {detailsString}"
        },
        log: {
            actionType: "detected_world_nuker",
            detailsPrefix: "Nuker Violation: "
        }
    },
    "combat_cps_high": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected abnormally high CPS (Clicks Per Second).",
            type: "combat_cps"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for High CPS. Count: {cpsCount} in {windowSeconds}s. Max: {threshold}"
        },
        log: {
            actionType: "detected_combat_cps_high",
            detailsPrefix: "High CPS Violation: "
        }
    },
    "combat_viewsnap_pitch": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected suspicious pitch snap after attack.",
            type: "combat_viewsnap"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Pitch Snap. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)"
        },
        log: {
            actionType: "detected_viewsnap_pitch",
            detailsPrefix: "Pitch Snap Violation: "
        }
    },
    "combat_viewsnap_yaw": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected suspicious yaw snap after attack.",
            type: "combat_viewsnap"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Yaw Snap. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)"
        },
        log: {
            actionType: "detected_viewsnap_yaw",
            detailsPrefix: "Yaw Snap Violation: "
        }
    },
    "combat_invalid_pitch": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected invalid view pitch (e.g., looking straight up/down).",
            type: "combat_view_violation"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Invalid Pitch. Pitch: {pitch}° (Limits: {minLimit}° to {maxLimit}°)"
        },
        log: {
            actionType: "detected_invalid_pitch",
            detailsPrefix: "Invalid Pitch Violation: "
        }
    },
    "combat_multitarget_aura": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected Multi-Target Aura (hitting multiple entities rapidly).",
            type: "combat_aura"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Multi-Target Aura. Targets: {targetsHit} in {windowSeconds}s (Threshold: {threshold})"
        },
        log: {
            actionType: "detected_multitarget_aura",
            detailsPrefix: "Multi-Target Aura Violation: "
        }
    },
    "combat_attack_while_sleeping": {
        enabled: true,
        flag: {
            increment: 5,
            reason: "System detected player attacking while sleeping.",
            type: "combat_state_conflict"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Attacking While Sleeping. Target: {targetEntity}"
        },
        log: {
            actionType: "detected_attack_while_sleeping",
            detailsPrefix: "Attack While Sleeping Violation: "
        }
    },
    "combat_attack_while_consuming": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected player attacking while consuming an item.",
            type: "combat_state_conflict_consuming"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Attacking While Consuming. State: {state}, Item Category: {itemUsed}"
        },
        log: {
            actionType: "detected_attack_while_consuming",
            detailsPrefix: "Attack While Consuming Violation: "
        }
    },
    "combat_attack_while_bow_charging": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected player attacking while charging a bow.",
            type: "combat_state_conflict_bow"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Attacking While Charging Bow. State: {state}, Item Category: {itemUsed}"
        },
        log: {
            actionType: "detected_attack_while_bow_charging",
            detailsPrefix: "Attack While Charging Bow Violation: "
        }
    },
    "combat_attack_while_shielding": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected player attacking while actively using a shield.",
            type: "combat_state_conflict_shield"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Attacking While Shielding. State: {state}, Item Category: {itemUsed}"
        },
        log: {
            actionType: "detected_attack_while_shielding",
            detailsPrefix: "Attack While Shielding Violation: "
        }
    },
    "world_illegal_item_use": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected use of a banned item: {itemTypeId}.",
            type: "world_illegal_item"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Illegal Item Use. Item: {itemTypeId}. Details: {detailsString}"
        },
        log: {
            actionType: "detected_illegal_item_use",
            detailsPrefix: "Illegal Item Use Violation: "
        }
    },
    "world_illegal_item_place": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected placement of a banned item: {itemTypeId}.",
            type: "world_illegal_item"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Illegal Item Placement. Item: {itemTypeId} at {blockLocationX},{blockLocationY},{blockLocationZ}. Details: {detailsString}"
        },
        log: {
            actionType: "detected_illegal_item_place",
            detailsPrefix: "Illegal Item Placement Violation: "
        }
    },
    "world_tower_build": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected suspicious tower-like building.",
            type: "world_scaffold_tower"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Tower Building. Height: {height}, Look Pitch: {pitch}° (Threshold: {pitchThreshold}°)"
        },
        log: {
            actionType: "detected_world_tower_build",
            detailsPrefix: "Tower Building Violation: "
        }
    },
    "world_flat_rotation_building": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected unnatural (flat or static) head rotation while building.",
            type: "world_scaffold_rotation"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Flat/Static Rotation Building. Pitch Variance: {pitchVariance}, Yaw Variance: {yawVariance}, Details: {details}"
        },
        log: {
            actionType: "detected_world_flat_rotation_building",
            detailsPrefix: "Flat/Static Rotation Building Violation: "
        }
    },
    "world_downward_scaffold": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected suspicious downward scaffolding while airborne.",
            type: "world_scaffold_downward"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Downward Scaffold. Blocks: {count}, Speed: {hSpeed}bps (MinSpeed: {minHSpeed}bps)"
        },
        log: {
            actionType: "detected_world_downward_scaffold",
            detailsPrefix: "Downward Scaffold Violation: "
        }
    },
    "world_air_place": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected block placed against air/liquid without solid support.",
            type: "world_scaffold_airplace"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Air Placement. Block: {blockType} at {x},{y},{z} targeting air/liquid."
        },
        log: {
            actionType: "detected_world_air_place",
            detailsPrefix: "Air Placement Violation: "
        }
    },
    "action_fast_use": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected item being used too quickly: {itemType}.",
            type: "action_fast_use"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Fast Use. Item: {itemType}, Cooldown: {cooldown}ms, Actual: {actualTime}ms"
        },
        log: {
            actionType: "detected_fast_use",
            detailsPrefix: "Fast Use Violation: "
        }
    },
    "world_fast_place": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "System detected blocks being placed too quickly.",
            type: "world_fast_place"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Fast Place. Blocks: {count} in {window}ms (Max: {maxBlocks})"
        },
        log: {
            actionType: "detected_world_fast_place",
            detailsPrefix: "Fast Place Violation: "
        }
    },
    "movement_noslow": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected movement faster than allowed for current action (e.g., eating, sneaking, using bow).",
            type: "movement_noslow"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for NoSlow. Action: {action}, Speed: {speed}bps (Max: {maxSpeed}bps)"
        },
        log: {
            actionType: "detected_movement_noslow",
            detailsPrefix: "NoSlow Violation: "
        }
    },
    "movement_invalid_sprint": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected sprinting under invalid conditions (e.g., blind, sneaking, riding).",
            type: "movement_invalid_sprint"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Invalid Sprint. Condition: {condition}"
        },
        log: {
            actionType: "detected_movement_invalid_sprint",
            detailsPrefix: "Invalid Sprint Violation: "
        }
    },
    "world_autotool": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "System detected suspicious tool switching before/after breaking a block (AutoTool).",
            type: "world_autotool"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for AutoTool. Block: {blockType}, ToolUsed: {toolType}, Switched: {switchPattern}"
        },
        log: {
            actionType: "detected_world_autotool",
            detailsPrefix: "AutoTool Violation: "
        }
    },
    "world_instabreak_unbreakable": {
        enabled: true,
        flag: {
            increment: 10,
            reason: "Attempted to break an unbreakable block: {blockType}.",
            type: "world_instabreak_unbreakable"
        },
        notifyAdmins: {
            message: "§cAC: {playerName} flagged for InstaBreak (Unbreakable). Block: {blockType} at {x},{y},{z}. Event cancelled."
        },
        log: {
            actionType: "detected_instabreak_unbreakable",
            detailsPrefix: "InstaBreak (Unbreakable) Violation: "
        }
    },
    "world_instabreak_speed": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected block broken significantly faster than possible: {blockType}.",
            type: "world_instabreak_speed"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for InstaBreak (Speed). Block: {blockType}. Expected: {expectedTicks}t, Actual: {actualTicks}t"
        },
        log: {
            actionType: "detected_instabreak_speed",
            detailsPrefix: "InstaBreak (Speed) Violation: "
        }
    },
    "player_namespoof": {
        enabled: true,
        flag: {
            increment: 5,
            reason: "System detected an invalid or suspicious player nameTag ({reasonDetail}).",
            type: "player_namespoof"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for NameSpoofing. Reason: {reasonDetail}. NameTag: '{nameTag}'"
        },
        log: {
            actionType: "detected_player_namespoof",
            detailsPrefix: "NameSpoof Violation: "
        }
    },
    "player_antigmc": {
        enabled: true,
        flag: {
            increment: 10,
            reason: "System detected unauthorized Creative Mode.",
            type: "player_antigmc"
        },
        notifyAdmins: {
            message: "§cAC: {playerName} detected in unauthorized Creative Mode! Switched to {switchToMode}: {autoSwitched}"
        },
        log: {
            actionType: "detected_player_antigmc",
            detailsPrefix: "Anti-GMC Violation: "
        }
    },
    "player_inventory_mod": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "System detected suspicious inventory/hotbar manipulation ({reasonDetail}).",
            type: "player_inventory_mod"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for InventoryMod. Detail: {reasonDetail}. Item: {itemType}, Slot: {slot}"
        },
        log: {
            actionType: "detected_player_inventory_mod",
            detailsPrefix: "InventoryMod Violation: "
        }
    },
    "chat_spam_fast_message": {
        enabled: true,
        flag: {
            type: "chat_spam_fast",
            increment: 1,
            reason: "Sent messages too quickly ({timeSinceLastMsgMs}ms apart)"
        },
        log: {
            actionType: "detected_fast_message_spam",
            detailsPrefix: "Msg: '{messageContent}'. Interval: {timeSinceLastMsgMs}ms. Threshold: {thresholdMs}ms. ",
            includeViolationDetails: false
        },
        notifyAdmins: {
            message: "§c[AC] §e{playerName} §7is sending messages too quickly ({timeSinceLastMsgMs}ms). Flagged. (Msg: §f{messageContent}§7)"
        },
        cancelMessage: true
    },
    "chat_spam_max_words": {
        enabled: true,
        flag: {
            type: "chat_spam_max_words",
            increment: 1,
            reason: "Message too long ({wordCount} words, max: {maxWords})"
        },
        log: {
            actionType: "detected_max_words_spam",
            detailsPrefix: "Words: {wordCount}, Max: {maxWords}. Msg (truncated): '{messageContent}'. ",
            includeViolationDetails: false
        },
        notifyAdmins: {
            message: "§c[AC] §e{playerName} §7sent message with too many words ({wordCount}/{maxWords}). Flagged. (Msg: §f{messageContent}§7)"
        },
        cancelMessage: true
    }
};

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
    adminTag, ownerPlayerName, enableDebugLogging, prefix,
    enableReachCheck, enableCpsCheck, enableViewSnapCheck, enableMultiTargetCheck,
    enableStateConflictCheck, enableFlyCheck, enableSpeedCheck, enableNofallCheck,
    enableNukerCheck, enableIllegalItemCheck,
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
    enableAntiGmcCheck,
    antiGmcSwitchToGameMode,
    antiGmcAutoSwitch,
    enableInventoryModCheck,
    enableSelfHurtCheck,
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
    maxVerticalSpeed, maxHorizontalSpeed, speedEffectBonus, minFallDistanceForDamage,
    flySustainedVerticalSpeedThreshold, flySustainedOffGroundTicksThreshold,
    flyHoverNearGroundThreshold, flyHoverVerticalSpeedThreshold, flyHoverOffGroundTicksThreshold,
    flyHoverMaxFallDistanceThreshold, speedToleranceBuffer, speedGroundConsecutiveTicksThreshold,
    maxCpsThreshold, reachDistanceSurvival, reachDistanceCreative, reachBuffer,
    cpsCalculationWindowMs, maxPitchSnapPerTick, maxYawSnapPerTick, viewSnapWindowTicks,
    invalidPitchThresholdMin, invalidPitchThresholdMax,
    multiTargetWindowMs, multiTargetThreshold, multiTargetMaxHistory,
    nukerMaxBreaksShortInterval, nukerCheckIntervalMs,
    enableNewlineCheck, flagOnNewline, cancelMessageOnNewline,
    enableMaxMessageLengthCheck, maxMessageLength, flagOnMaxMessageLength, cancelOnMaxMessageLength,
    spamRepeatCheckEnabled, spamRepeatMessageCount, spamRepeatTimeWindowSeconds,
    spamRepeatFlagPlayer, spamRepeatCancelMessage,
    enableFastMessageSpamCheck,
    fastMessageSpamThresholdMs,
    fastMessageSpamActionProfileName,
    enableMaxWordsSpamCheck,
    maxWordsSpamThreshold,
    maxWordsSpamActionProfileName,
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
    xrayDetectionNotifyOnOreMineEnabled,
    xrayDetectionMonitoredOres,
    xrayDetectionAdminNotifyByDefault,
    acGlobalNotificationsDefaultOn,
    enableCombatLogDetection,
    combatLogThresholdSeconds,
    combatLogFlagIncrement,
    combatLogReason,
    combatLogMessage,
    enableWelcomerMessage,
    welcomeMessage,
    notifyAdminOnNewPlayerJoin,
    enableDeathCoordsMessage,
    deathCoordsMessage,
    serverRules,
    discordLink,
    websiteLink,
    helpLinks,
    generalHelpMessages,
    enableTpaSystem,
    tpaRequestTimeoutSeconds,
    tpaRequestCooldownSeconds,
    tpaTeleportWarmupSeconds,
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
    } else if (typeof oldValue !== typeof coercedNewValue && !Array.isArray(oldValue)) { // Allow assigning new array to array type
        console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected ${originalType}, got ${typeof coercedNewValue}. Update rejected.`);
        return false;
    }

    // For arrays and objects, a simple comparison checks reference, not content.
    // For this application, if new and old value are "equal" by strict comparison, consider it unchanged.
    // Deep equality check for objects/arrays could be added if needed but adds complexity.
    if (oldValue === coercedNewValue) {
        if (enableDebugLogging) console.log(`[ConfigManager] No change for ${key}, value is already ${coercedNewValue}`);
        return false; // Value is the same, not technically an "update"
    }

    editableConfigValues[key] = coercedNewValue;
    if (enableDebugLogging) console.log(`[ConfigManager] Updated ${key} from "${oldValue}" to "${coercedNewValue}"`);
    return true;
}

[end of AntiCheatsBP/scripts/config.js]
