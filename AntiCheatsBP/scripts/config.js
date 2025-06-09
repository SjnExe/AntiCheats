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
export const enableTPASystem = false;

/**
 * @type {number}
 * How long (in seconds) a TPA request remains valid before automatically declining.
 */
export const TPARequestTimeoutSeconds = 60;

/**
 * @type {number}
 * Cooldown in seconds a player must wait after sending a TPA/TPAHere request before sending another.
 */
export const TPARequestCooldownSeconds = 10;

/** @type {number} Duration in seconds a player must wait (warm-up) before teleportation occurs after a TPA request is accepted. Taking damage during warm-up cancels the teleport. */
export const TPATeleportWarmupSeconds = 10;

// --- Anti-Grief Settings ---
/** @type {boolean} If true, the TNT Anti-Grief system is active. */
export const enableTntAntiGrief = false;

/** @type {boolean} If true, Admins/Owners are allowed to place TNT without restriction. */
export const allowAdminTntPlacement = true;

/** @type {string} Action to take for unauthorized TNT placement. Valid: "remove", "warn", "logOnly". */
export const tntPlacementAction = "remove";

/** @type {boolean} If true, the Wither Anti-Grief system is active. */
export const enableWitherAntiGrief = false;

/** @type {boolean} If true, Admins/Owners are allowed to spawn Withers without restriction. */
export const allowAdminWitherSpawn = true;

/** @type {string} Action to take for unauthorized Wither spawns. Valid: "prevent", "kill", "logOnly". */
export const witherSpawnAction = "prevent";

/** @type {boolean} If true, the Fire Anti-Grief system is active. */
export const enableFireAntiGrief = false;

/** @type {boolean} If true, Admins/Owners are allowed to start fires without restriction. */
export const allowAdminFire = true;

/** @type {number} Maximum number of fire blocks a non-admin can be responsible for in a defined scope/time. */
export const maxPlayerStartedFires = 10;

/** @type {number} Time in seconds. If a fire started by a player spreads for too long, consider extinguishing it. */
export const fireSpreadDurationLimit = 60;

/** @type {string} Action to take for unauthorized or excessive fire. Valid: "extinguish", "warn", "logOnly". */
export const fireControlAction = "extinguish";

/** @type {boolean} If true, the Lava Anti-Grief system is active. */
export const enableLavaAntiGrief = false;

/** @type {boolean} If true, Admins/Owners are allowed to place lava without restriction. */
export const allowAdminLava = true;

/** @type {string} Action to take for unauthorized lava placement. Valid: "remove", "warn", "logOnly". */
export const lavaPlacementAction = "remove";

/** @type {boolean} If true, the Water Anti-Grief system is active. */
export const enableWaterAntiGrief = false;

/** @type {boolean} If true, Admins/Owners are allowed to place water without restriction. */
export const allowAdminWater = true;

/** @type {string} Action to take for unauthorized water placement. Valid: "remove", "warn", "logOnly". */
export const waterPlacementAction = "remove";

/** @type {boolean} If true, the Block Spam Anti-Grief system is active. */
export const enableBlockSpamAntiGrief = false;

/** @type {boolean} If true, players in Creative mode bypass the block spam check. */
export const blockSpamBypassInCreative = true;

/** @type {number} Time window in milliseconds to count block placements for spam detection. */
export const blockSpamTimeWindowMs = 1000;

/** @type {number} Maximum blocks allowed in the time window before flagging for spam. */
export const blockSpamMaxBlocksInWindow = 8;

/** @type {string[]} List of block type IDs to specifically monitor for spam. If empty, all blocks are monitored. */
export const blockSpamMonitoredBlockTypes = ["minecraft:dirt", "minecraft:cobblestone", "minecraft:netherrack", "minecraft:sand", "minecraft:gravel"];

/** @type {string} Action to take for detected block spam. Valid: "warn", "logOnly". */
export const blockSpamAction = "warn";

/** @type {boolean} If true, the Entity Spam Anti-Grief system is active. */
export const enableEntitySpamAntiGrief = false;

/** @type {boolean} If true, players in Creative mode bypass the entity spam check. */
export const entitySpamBypassInCreative = true;

/** @type {number} Time window in milliseconds to count entity spawns for spam detection by a player. */
export const entitySpamTimeWindowMs = 2000;

/** @type {number} Maximum monitored entities a player can spawn in the time window before flagging. */
export const entitySpamMaxSpawnsInWindow = 5;

/** @type {string[]} List of entity type IDs to specifically monitor for spam. If empty, this check might be too broad or not trigger. */
export const entitySpamMonitoredEntityTypes = ["minecraft:boat", "minecraft:armor_stand", "minecraft:item_frame", "minecraft:minecart", "minecraft:snow_golem", "minecraft:iron_golem"];

/** @type {string} Action to take for detected entity spam. Valid: "kill", "warn", "logOnly". */
export const entitySpamAction = "kill";

/** @type {boolean} If true, the Density-Based Block Spam Anti-Grief system is active. */
export const enableBlockSpamDensityCheck = false;

/** @type {number} Radius for the density check cube (e.g., 1 means 3x3x3 cube). */
export const blockSpamDensityCheckRadius = 1;

/** @type {number} Time window in ticks to consider recent blocks for density calculation. */
export const blockSpamDensityTimeWindowTicks = 60; // 3 seconds

/** @type {number} Percentage of volume filled by player's recent blocks to trigger detection. */
export const blockSpamDensityThresholdPercentage = 70;

/** @type {string[]} List of block type IDs to specifically monitor for density spam. If empty, all blocks are monitored. */
export const blockSpamDensityMonitoredBlockTypes = ["minecraft:dirt", "minecraft:cobblestone", "minecraft:netherrack", "minecraft:sand", "minecraft:gravel"];

/** @type {string} Action to take for detected density block spam. Valid: "warn", "logOnly". */
export const blockSpamDensityAction = "warn";

// --- Piston Lag Check Settings ---
/** @type {boolean} If true, the Piston Lag check is active. */
export const enablePistonLagCheck = false;
/** @type {number} Number of piston activations per second at a single location to be considered rapid. */
export const pistonActivationLogThresholdPerSecond = 15;
/** @type {number} Duration in seconds the rapid activation rate must be sustained to trigger a log/notification. */
export const pistonActivationSustainedDurationSeconds = 3;
/** @type {number} Cooldown in seconds before logging/notifying again for the same piston location. */
export const pistonLagLogCooldownSeconds = 60;

// --- Client Behavior Checks ---
/** @type {boolean} If true, the Invalid Render Distance check is active. */
export const enableInvalidRenderDistanceCheck = true;
/** @type {number} Maximum allowed client-reported render distance in chunks. */
export const maxAllowedClientRenderDistance = 64;

// --- World Border System --- (Already existing section, adding more to it)
/** @type {boolean} Master switch for the entire World Border feature. */
export const enableWorldBorderSystem = false; // This was from previous subtask, ensure it's here

/** @type {string} Message sent to players when they are teleported back by the world border. */
export const worldBorderWarningMessage = "§cYou have reached the world border!"; // This was from previous subtask

/** @type {boolean} Default for enabling damage when a new border is set or damage is toggled on. */
export const worldBorderDefaultEnableDamage = false;
/** @type {number} Default damage amount per interval when border damage is enabled. */
export const worldBorderDefaultDamageAmount = 0.5; // Half a heart
/** @type {number} Default interval in ticks for applying border damage. (20 ticks = 1 second) */
export const worldBorderDefaultDamageIntervalTicks = 20;
/** @type {number} Default number of damage events after which player is teleported if still outside and damage is enabled. */
export const worldBorderTeleportAfterNumDamageEvents = 30; // e.g., 30 damage applications (30 seconds if interval is 20 ticks)

/** @type {boolean} Enables visual particle effects for the world border. */
export const worldBorderEnableVisuals = false;
/** @type {string} The particle name to use for the border visuals. E.g., "minecraft:end_rod", "minecraft:totem_particle". */
export const worldBorderParticleName = "minecraft:end_rod";
/** @type {number} How close (in blocks) a player must be to a border edge to see the visual effect. */
export const worldBorderVisualRange = 24;
/** @type {number} Density of particles along the border edge (particles per block). Higher is denser. */
export const worldBorderParticleDensity = 1;
/** @type {number} Height of the particle wall in blocks. */
export const worldBorderParticleWallHeight = 4;
/** @type {number} Length of the particle wall segment to render in front of/around the player. */
export const worldBorderParticleSegmentLength = 32;
/** @type {number} Interval in ticks for how often to update border visuals per player. */
export const worldBorderVisualUpdateIntervalTicks = 10; // 0.5 seconds


// --- Chat Behavior Checks ---
/** @type {boolean} If true, the Chat During Combat check is active. */
export const enableChatDuringCombatCheck = true;
/** @type {number} Seconds after the last combat interaction during which a player cannot chat. */
export const chatDuringCombatCooldownSeconds = 4;
/** @type {boolean} If true, the Chat During Item Use check is active. */
export const enableChatDuringItemUseCheck = true;

// --- Chat Formatting Settings ---
/** @type {string} Default color for the Owner rank's chat prefix. */
export const chatFormatOwnerPrefixColor = "§c";
/** @type {string} Default color for the Owner rank's name in chat. */
export const chatFormatOwnerNameColor = "§c";
/** @type {string} Default color for the Owner rank's messages in chat. */
export const chatFormatOwnerMessageColor = "§f";

/** @type {string} Default color for the Admin rank's chat prefix. */
export const chatFormatAdminPrefixColor = "§b";
/** @type {string} Default color for the Admin rank's name in chat. */
export const chatFormatAdminNameColor = "§b";
/** @type {string} Default color for the Admin rank's messages in chat. */
export const chatFormatAdminMessageColor = "§f";

/** @type {string} Default color for the Member rank's chat prefix. */
export const chatFormatMemberPrefixColor = "§7";
/** @type {string} Default color for the Member rank's name in chat. */
export const chatFormatMemberNameColor = "§7";
/** @type {string} Default color for the Member rank's messages in chat. */
export const chatFormatMemberMessageColor = "§f";

// --- Player Join/Leave Logging ---
/** @type {boolean} If true, detailed logging for player join and leave events is enabled. */
export const enableDetailedJoinLeaveLogging = true;


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
 * }}
 */
export const automodConfig = {
    /**
     * Defines sets of rules for different checkTypes.
     * Each key is a checkType (e.g., "fly_hover", "combat_cps_high"),
     * and its value is an array of AutoModRule objects, ordered by escalating severity.
     * Example: "fly_hover": [ { flagThreshold: 5, actionType: "WARN", ... }, { flagThreshold: 10, actionType: "KICK", ... } ]
     */
    automodRules: {
        "example_fly_hover": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.fly.hover.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.fly.hover.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.fly.hover.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "example_speed_ground": [
            { flagThreshold: 15, actionType: "WARN", parameters: { reasonKey: "automod.speed.ground.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "KICK", parameters: { reasonKey: "automod.speed.ground.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 35, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.speed.ground.tempban1", duration: "5m" }, resetFlagsAfterAction: true }
        ],
        "combat_cps_high": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.cps.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.cps.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.cps.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "movement_nofall": [
            { flagThreshold: 9, actionType: "WARN", parameters: { reasonKey: "automod.nofall.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "KICK", parameters: { reasonKey: "automod.nofall.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.nofall.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "world_illegal_item_use": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.illegalitem.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.illegalitem.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.illegalitem.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "player_namespoof": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.namespoof.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "KICK", parameters: { reasonKey: "automod.namespoof.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.namespoof.tempban1", duration: "1h" }, resetFlagsAfterAction: true }
        ],
        "example_reach_attack": [
            { flagThreshold: 15, actionType: "WARN", parameters: { reasonKey: "automod.reach.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "KICK", parameters: { reasonKey: "automod.reach.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 40, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.reach.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "movement_noslow": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.noslow.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.noslow.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.noslow.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "action_fast_use": [
            { flagThreshold: 15, actionType: "WARN", parameters: { reasonKey: "automod.fastuse.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "KICK", parameters: { reasonKey: "automod.fastuse.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 40, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.fastuse.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "player_antigmc": [
            { flagThreshold: 10, actionType: "KICK", parameters: { reasonKey: "automod.antigmc.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.antigmc.tempban1", duration: "1d" }, resetFlagsAfterAction: true }
        ],
        "combat_multitarget_aura": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.multitarget.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.multitarget.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.multitarget.tempban1", duration: "1h" }, resetFlagsAfterAction: true }
        ],
        "world_illegal_item_place": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.illegalplace.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.illegalplace.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.illegalplace.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "movement_invalid_sprint": [
            { flagThreshold: 8, actionType: "WARN", parameters: { reasonKey: "automod.invalidsprint.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 16, actionType: "KICK", parameters: { reasonKey: "automod.invalidsprint.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 24, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.invalidsprint.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "chat_spam_fast_message": [
            { flagThreshold: 5, actionType: "WARN", parameters: { reasonKey: "automod.chatfast.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "MUTE", parameters: { reasonKey: "automod.chatfast.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "MUTE", parameters: { reasonKey: "automod.chatfast.mute2", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combat_invalid_pitch": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.invalidpitch.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.invalidpitch.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.invalidpitch.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combat_attack_while_sleeping": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.attacksleep.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "KICK", parameters: { reasonKey: "automod.attacksleep.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.attacksleep.tempban1", duration: "1h" }, resetFlagsAfterAction: true }
        ],
        "world_instabreak_speed": [
            { flagThreshold: 9, actionType: "WARN", parameters: { reasonKey: "automod.instabreak.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "KICK", parameters: { reasonKey: "automod.instabreak.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.instabreak.tempban1", duration: "1h" }, resetFlagsAfterAction: true }
        ],
        "chat_spam_max_words": [
            { flagThreshold: 5, actionType: "WARN", parameters: { reasonKey: "automod.chatmaxwords.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "MUTE", parameters: { reasonKey: "automod.chatmaxwords.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "MUTE", parameters: { reasonKey: "automod.chatmaxwords.mute2", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combat_viewsnap_pitch": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.viewsnap.pitch.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.viewsnap.pitch.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.viewsnap.pitch.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "combat_viewsnap_yaw": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.viewsnap.yaw.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.viewsnap.yaw.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.viewsnap.yaw.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "combat_attack_while_consuming": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.attackconsume.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.attackconsume.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.attackconsume.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "player_invalid_render_distance": [
            { flagThreshold: 3, actionType: "WARN", parameters: { reasonKey: "automod.renderdistance.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 5, actionType: "KICK", parameters: { reasonKey: "automod.renderdistance.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.renderdistance.tempban1", duration: "1h" }, resetFlagsAfterAction: true }
        ]
        // Add more checkTypes here in the future
    },

    /**
     * Stores user-facing messages for AutoMod actions.
     * Keys are `reasonKey` strings (e.g., "automod.fly.hover.warn") used in `AutoModRule.parameters`.
     * Values are the message strings.
     * Example: "automod.fly.hover.warn": "AutoMod: Flying (hover) detected. Please return to the ground."
     */
    automodActionMessages: {
        "automod.fly.hover.warn1": "AutoMod: Persistent hovering detected. Please adhere to server rules.",
        "automod.fly.hover.kick1": "AutoMod: Kicked for continued hovering violations.",
        "automod.fly.hover.tempban1": "AutoMod: Temporarily banned for excessive hovering violations.",
        "automod.speed.ground.warn1": "AutoMod: Excessive ground speed detected. Please play fairly.",
        "automod.speed.ground.kick1": "AutoMod: Kicked for repeated ground speed violations.",
        "automod.speed.ground.tempban1": "AutoMod: Temporarily banned for repeated ground speed violations.",
        "automod.cps.warn1": "AutoMod: High click speed detected multiple times.",
        "automod.cps.kick1": "AutoMod: Kicked for repeated high click speed violations.",
        "automod.cps.tempban1": "AutoMod: Temporarily banned for excessive click speed violations.",
        "automod.nofall.warn1": "AutoMod: NoFall (fall damage negation) detected multiple times.",
        "automod.nofall.kick1": "AutoMod: Kicked for repeated NoFall violations.",
        "automod.nofall.tempban1": "AutoMod: Temporarily banned for excessive NoFall violations.",
        "automod.illegalitem.warn1": "AutoMod: Use of illegal items detected. Items may be removed if behavior persists.",
        "automod.illegalitem.kick1": "AutoMod: Kicked for repeated use of illegal items.",
        "automod.illegalitem.tempban1": "AutoMod: Temporarily banned for excessive use of illegal items.",
        "automod.namespoof.warn1": "AutoMod: Name spoofing detected. Please change your name.",
        "automod.namespoof.kick1": "AutoMod: Kicked for repeated name spoofing violations.",
        "automod.namespoof.tempban1": "AutoMod: Temporarily banned for excessive name spoofing violations.",
        "automod.reach.warn1": "AutoMod: Excessive reach detected.",
        "automod.reach.kick1": "AutoMod: Kicked for repeated reach violations.",
        "automod.reach.tempban1": "AutoMod: Temporarily banned for excessive reach violations.",
        "automod.noslow.warn1": "AutoMod: NoSlow (movement exploit) detected.",
        "automod.noslow.kick1": "AutoMod: Kicked for repeated NoSlow violations.",
        "automod.noslow.tempban1": "AutoMod: Temporarily banned for excessive NoSlow violations.",
        "automod.fastuse.warn1": "AutoMod: Fast item usage detected.",
        "automod.fastuse.kick1": "AutoMod: Kicked for repeated fast item usage.",
        "automod.fastuse.tempban1": "AutoMod: Temporarily banned for excessive fast item usage.",
        "automod.antigmc.kick1": "AutoMod: Kicked for unauthorized Creative Mode usage.",
        "automod.antigmc.tempban1": "AutoMod: Temporarily banned for repeated unauthorized Creative Mode usage.",
        "automod.antigmc.permban1": "AutoMod: Permanently banned for repeated unauthorized Creative Mode usage.",
        "automod.multitarget.warn1": "AutoMod: Attacking multiple targets too quickly. Please play fairly.",
        "automod.multitarget.kick1": "AutoMod: Kicked for repeated multi-target aura violations.",
        "automod.multitarget.tempban1": "AutoMod: Temporarily banned for excessive multi-target aura violations.",
        "automod.illegalplace.warn1": "AutoMod: Placing illegal or restricted items detected.",
        "automod.illegalplace.kick1": "AutoMod: Kicked for repeatedly placing illegal items.",
        "automod.illegalplace.tempban1": "AutoMod: Temporarily banned for excessively placing illegal items.",
        "automod.invalidsprint.warn1": "AutoMod: Sprinting under invalid conditions detected multiple times.",
        "automod.invalidsprint.kick1": "AutoMod: Kicked for repeated invalid sprint violations.",
        "automod.invalidsprint.tempban1": "AutoMod: Temporarily banned for excessive invalid sprint violations.",
        "automod.chatfast.warn1": "AutoMod: Please do not send messages so quickly.",
        "automod.chatfast.mute1": "AutoMod: Muted for 5 minutes for sending messages too quickly.",
        "automod.chatfast.mute2": "AutoMod: Muted for 30 minutes for persistent fast message spam.",
        "automod.invalidpitch.warn1": "AutoMod: Invalid viewing angles detected multiple times.",
        "automod.invalidpitch.kick1": "AutoMod: Kicked for repeated invalid viewing angles.",
        "automod.invalidpitch.tempban1": "AutoMod: Temporarily banned for excessive invalid viewing angles.",
        "automod.attacksleep.warn1": "AutoMod: Attacking while sleeping detected.",
        "automod.attacksleep.kick1": "AutoMod: Kicked for repeatedly attacking while sleeping.",
        "automod.attacksleep.tempban1": "AutoMod: Temporarily banned for excessively attacking while sleeping.",
        "automod.instabreak.warn1": "AutoMod: Breaking blocks too quickly detected multiple times.",
        "automod.instabreak.kick1": "AutoMod: Kicked for repeated instabreak violations.",
        "automod.instabreak.tempban1": "AutoMod: Temporarily banned for excessive instabreak violations.",
        "automod.chatmaxwords.warn1": "AutoMod: Please avoid sending messages with excessive words.",
        "automod.chatmaxwords.mute1": "AutoMod: Muted for 5 minutes for sending messages with too many words.",
        "automod.chatmaxwords.mute2": "AutoMod: Muted for 30 minutes for persistent overly long messages.",
        "automod.viewsnap.pitch.warn1": "AutoMod: Suspicious vertical camera movements detected.",
        "automod.viewsnap.pitch.kick1": "AutoMod: Kicked for repeated suspicious vertical camera movements.",
        "automod.viewsnap.pitch.tempban1": "AutoMod: Temporarily banned for excessive suspicious vertical camera movements.",
        "automod.viewsnap.yaw.warn1": "AutoMod: Suspicious horizontal camera movements detected.",
        "automod.viewsnap.yaw.kick1": "AutoMod: Kicked for repeated suspicious horizontal camera movements.",
        "automod.viewsnap.yaw.tempban1": "AutoMod: Temporarily banned for excessive suspicious horizontal camera movements.",
        "automod.attackconsume.warn1": "AutoMod: Attacking while consuming items detected.",
        "automod.attackconsume.kick1": "AutoMod: Kicked for repeatedly attacking while consuming items.",
        "automod.attackconsume.tempban1": "AutoMod: Temporarily banned for excessively attacking while consuming items.",
        "automod.renderdistance.warn1": "AutoMod: Invalid client render distance reported.",
        "automod.renderdistance.kick1": "AutoMod: Kicked for repeatedly reporting invalid render distance.",
        "automod.renderdistance.tempban1": "AutoMod: Temporarily banned for persistently reporting invalid render distance."
        // Add more messages here
    },

    /**
     * Allows enabling or disabling AutoMod for specific checkTypes.
     * Keys are checkType strings (e.g., "fly_hover").
     * Values are booleans (true to enable AutoMod for this check, false to disable).
     * If a checkType is not listed here, AutoMod processing for it might be skipped or default to enabled,
     * depending on `automodManager.js` logic (current logic implies it would skip if not found or if no rules).
     */
    automodPerCheckTypeToggles: {
        "example_fly_hover": true, // Renamed from fly_hover
        "example_speed_ground": true, // Renamed from speed_ground
        "combat_cps_high": true,
        "movement_nofall": true,
        "world_illegal_item_use": true,
        "player_namespoof": true,
        "player_antigmc": true,
        "combat_multitarget_aura": true,
        "world_illegal_item_place": true,
        "movement_invalid_sprint": true,
        "chat_spam_fast_message": true,
        "combat_invalid_pitch": true,
        "combat_attack_while_sleeping": true,
        "world_instabreak_speed": true,
        "chat_spam_max_words": true,
        "combat_viewsnap_pitch": true,
        "combat_viewsnap_yaw": true,
        "combat_attack_while_consuming": true,
        "player_invalid_render_distance": true
        // Add more checkTypes here
    }
};

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
    },
    "world_antigrief_tnt_place": {
        enabled: true, // This will be controlled by enableTntAntiGrief at a higher level
        flag: {
            increment: 1,
            reason: "Player attempted to place TNT without authorization.",
            type: "antigrief_tnt"
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: {playerName} attempted to place TNT at {x},{y},{z}. Action: {actionTaken}."
        },
        log: {
            actionType: "antigrief_tnt_placement",
            detailsPrefix: "AntiGrief TNT: "
        }
    },
    "world_antigrief_wither_spawn": {
        enabled: true, // This will be effectively controlled by enableWitherAntiGrief at a higher level
        flag: {
            increment: 5, // Wither griefing is severe
            reason: "Player involved in unauthorized Wither spawn or Wither killed by AntiGrief.",
            type: "antigrief_wither"
        },
        notifyAdmins: {
            message: "§cAC [AntiGrief]: A Wither spawn event occurred. Context: {playerNameOrContext}. Action: {actionTaken}."
        },
        log: {
            actionType: "antigrief_wither_spawn",
            detailsPrefix: "AntiGrief Wither: "
        }
    },
    "world_antigrief_fire": {
        enabled: true, // Effectively controlled by enableFireAntiGrief
        flag: {
            increment: 2,
            reason: "Player involved in unauthorized or excessive fire incident.",
            type: "antigrief_fire"
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: Fire event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}"
        },
        log: {
            actionType: "antigrief_fire_incident",
            detailsPrefix: "AntiGrief Fire: "
        }
    },
    "world_antigrief_lava": {
        enabled: true, // Effectively controlled by enableLavaAntiGrief
        flag: {
            increment: 2,
            reason: "Player involved in unauthorized lava placement.",
            type: "antigrief_lava"
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: Lava placement event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}"
        },
        log: {
            actionType: "antigrief_lava_placement",
            detailsPrefix: "AntiGrief Lava: "
        }
    },
    "world_antigrief_water": {
        enabled: true, // Effectively controlled by enableWaterAntiGrief
        flag: {
            increment: 1, // Water grief is often less permanent than lava/TNT
            reason: "Player involved in unauthorized water placement.",
            type: "antigrief_water"
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: Water placement event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}"
        },
        log: {
            actionType: "antigrief_water_placement",
            detailsPrefix: "AntiGrief Water: "
        }
    },
    "world_antigrief_blockspam": {
        enabled: true, // Effectively controlled by enableBlockSpamAntiGrief
        flag: {
            increment: 1,
            reason: "Player suspected of block spamming.",
            type: "antigrief_blockspam"
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: {playerName} suspected of Block Spam. Blocks: {count}/{maxBlocks} in {windowMs}ms. Type: {blockType}. Action: {actionTaken}."
        },
        log: {
            actionType: "antigrief_blockspam_detected",
            detailsPrefix: "AntiGrief BlockSpam: "
        }
    },
    "world_antigrief_entityspam": {
        enabled: true, // Effectively controlled by enableEntitySpamAntiGrief
        flag: {
            increment: 1,
            reason: "Player suspected of entity spamming.",
            type: "antigrief_entityspam"
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: {playerName} suspected of Entity Spam. Entity: {entityType}. Count: {count}/{maxSpawns} in {windowMs}ms. Action: {actionTaken}."
        },
        log: {
            actionType: "antigrief_entityspam_detected",
            detailsPrefix: "AntiGrief EntitySpam: "
        }
    },
    "world_antigrief_blockspam_density": {
        enabled: true, // Effectively controlled by enableBlockSpamDensityCheck
        flag: {
            increment: 2, // Potentially more severe than just rate
            reason: "Player suspected of block spamming (high density).",
            type: "antigrief_blockspam_density" // Distinct flag type
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: {playerName} suspected of Block Spam (Density). Density: {densityPercentage}% in {radius} radius. Block: {blockType}. Action: {actionTaken}."
        },
        log: {
            actionType: "antigrief_blockspam_density_detected",
            detailsPrefix: "AntiGrief BlockSpam (Density): "
        }
    },
    "world_antigrief_piston_lag": {
        "enabled": true,
        "flag": null,
        "notifyAdmins": {
            "message": "§eAC [AntiGrief]: Rapid piston activity detected at {x},{y},{z} in {dimensionId}. Rate: {rate}/sec over {duration}s. (Potential Lag)"
        },
        "log": {
            "actionType": "antigrief_piston_lag_detected",
            "detailsPrefix": "AntiGrief Piston Lag: "
        }
    },
    "player_invalid_render_distance": {
        "enabled": true,
        "flag": {
            "increment": 1,
            "reason": "Client reported an excessive render distance: {reportedDistance} chunks (Max: {maxAllowed} chunks).",
            "type": "player_client_anomaly"
        },
        "notifyAdmins": {
            "message": "§eAC: {playerName} reported render distance of {reportedDistance} chunks (Max: {maxAllowed}). Potential client modification."
        },
        "log": {
            "actionType": "detected_invalid_render_distance",
            "detailsPrefix": "Invalid Render Distance: "
        }
    },
    "player_chat_during_combat": {
        "enabled": true,
        "flag": {
            "increment": 1,
            "reason": "Attempted to chat too soon after combat ({timeSinceCombat}s ago).",
            "type": "player_chat_state_violation"
        },
        "notifyAdmins": {
            "message": "§eAC: {playerName} attempted to chat during combat cooldown ({timeSinceCombat}s ago). Message cancelled."
        },
        "cancelMessage": true,
        "log": {
            "actionType": "detected_chat_during_combat",
            "detailsPrefix": "Chat During Combat: "
        }
    },
    "player_chat_during_item_use": {
        "enabled": true,
        "flag": {
            "increment": 1,
            "reason": "Attempted to chat while actively using an item ({itemUseState}).",
            "type": "player_chat_state_violation"
        },
        "notifyAdmins": {
            "message": "§eAC: {playerName} attempted to chat while {itemUseState}. Message cancelled."
        },
        "cancelMessage": true,
        "log": {
            "actionType": "detected_chat_during_item_use",
            "detailsPrefix": "Chat During Item Use: "
        }
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
    adminTag, ownerPlayerName, enableDebugLogging, prefix, enableAutoMod,
    enableReachCheck, enableCPSCheck, enableViewSnapCheck, enableMultiTargetCheck,
    enableStateConflictCheck, enableFlyCheck, enableSpeedCheck, enableNofallCheck,
    enableNukerCheck, enableIllegalItemCheck, enableSelfHurtCheck, enableNetherRoofCheck,
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
    flyHoverMaxFallDistanceThreshold, speedToleranceBuffer, speedGroundConsecutiveTicksThreshold, netherRoofYLevelThreshold,
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
    enableDeathEffects,
    deathEffectParticleName,
    deathEffectSoundId,
    defaultDeathEffect, // Keeping for now, though individual particle/sound are preferred
    serverRules,
    discordLink,
    websiteLink,
    helpLinks,
    generalHelpMessages,
    enableTPASystem,
    TPARequestTimeoutSeconds,
    TPARequestCooldownSeconds,
    TPATeleportWarmupSeconds,
    // AntiGrief TNT Configs
    enableTntAntiGrief,
    allowAdminTntPlacement,
    tntPlacementAction,
    // AntiGrief Wither Configs
    enableWitherAntiGrief,
    allowAdminWitherSpawn,
    witherSpawnAction,
    // AntiGrief Fire Configs
    enableFireAntiGrief,
    allowAdminFire,
    maxPlayerStartedFires,
    fireSpreadDurationLimit,
    fireControlAction,
    // AntiGrief Lava Configs
    enableLavaAntiGrief,
    allowAdminLava,
    lavaPlacementAction,
    // AntiGrief Water Configs
    enableWaterAntiGrief,
    allowAdminWater,
    waterPlacementAction,
    // AntiGrief Block Spam Configs
    enableBlockSpamAntiGrief,
    blockSpamBypassInCreative,
    blockSpamTimeWindowMs,
    blockSpamMaxBlocksInWindow,
    blockSpamMonitoredBlockTypes,
    blockSpamAction,
    // AntiGrief Entity Spam Configs
    enableEntitySpamAntiGrief,
    entitySpamBypassInCreative,
    entitySpamTimeWindowMs,
    entitySpamMaxSpawnsInWindow,
    entitySpamMonitoredEntityTypes: ["minecraft:boat", "minecraft:armor_stand", "minecraft:item_frame", "minecraft:minecart", "minecraft:snow_golem", "minecraft:iron_golem"],
    entitySpamAction,
    // AntiGrief Density Block Spam Configs
    enableBlockSpamDensityCheck,
    blockSpamDensityCheckRadius,
    blockSpamDensityTimeWindowTicks,
    blockSpamDensityThresholdPercentage,
    blockSpamDensityMonitoredBlockTypes,
    blockSpamDensityAction,
    // Piston Lag Check
    enablePistonLagCheck,
    pistonActivationLogThresholdPerSecond,
    pistonActivationSustainedDurationSeconds,
    pistonLagLogCooldownSeconds,
    // Client Behavior Checks
    enableInvalidRenderDistanceCheck,
    maxAllowedClientRenderDistance,
    // World Border System
    enableWorldBorderSystem,
    worldBorderWarningMessage,
    worldBorderDefaultEnableDamage,
    worldBorderDefaultDamageAmount,
    worldBorderDefaultDamageIntervalTicks,
    worldBorderTeleportAfterNumDamageEvents,
    worldBorderEnableVisuals,
    worldBorderParticleName,
    worldBorderVisualRange,
    worldBorderParticleDensity,
    worldBorderParticleWallHeight,
    worldBorderParticleSegmentLength,
    worldBorderVisualUpdateIntervalTicks,
    // Chat Behavior Checks
    enableChatDuringCombatCheck,
    chatDuringCombatCooldownSeconds,
    enableChatDuringItemUseCheck,
    // Chat Formatting Settings
    chatFormatOwnerPrefixColor,
    chatFormatOwnerNameColor,
    chatFormatOwnerMessageColor,
    chatFormatAdminPrefixColor,
    chatFormatAdminNameColor,
    chatFormatAdminMessageColor,
    chatFormatMemberPrefixColor,
    chatFormatMemberNameColor,
    chatFormatMemberMessageColor,
    // Player Join/Leave Logging
    enableDetailedJoinLeaveLogging,
    // AutoMod Configuration
    automodConfig,
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
