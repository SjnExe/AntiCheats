// Anti-Cheat Configuration File
import { checkActionProfiles } from '../core/actionProfiles.js';
import { automodConfig as importedAutoModConfig } from '../core/automodConfig.js';

// General Admin & System
/** @type {string} The tag for identifying admin players. */
export const adminTag = "admin";
/** @type {string} The exact name of the server owner. Required for owner-level commands/features. */
export const ownerPlayerName = "PlayerNameHere";
/** @type {boolean} If true, enables detailed debug logging to console. */
export const enableDebugLogging = true;
/** @type {string} The prefix for chat-based commands (e.g., "!", "."). */
export const prefix = "!";
/** @type {string} Default language code for server messages if player's language is not set or translation missing. */
export const defaultServerLanguage = "en_US";

// Welcomer & Player Info
/** @type {boolean} If true, a welcome message is sent to players when they join. */
export const enableWelcomerMessage = true;
/** @type {string} Localization key for the welcome message. */
export const welcomeMessage = "message.welcome";
/** @type {boolean} If true, admins are notified when a new player joins for the first time. */
export const notifyAdminOnNewPlayerJoin = true;
/** @type {boolean} If true, players are sent their death coordinates upon respawning. */
export const enableDeathCoordsMessage = true;
/** @type {string} Localization key for the death coordinates message. */
export const deathCoordsMessage = "message.deathCoords";

// Combat Log
/** @type {boolean} If true, enables detection of players leaving shortly after combat. */
export const enableCombatLogDetection = false;
/** @type {number} Seconds after last combat interaction within which leaving is considered combat logging. */
export const combatLogThresholdSeconds = 15;
/** @type {number} Number of flags to add for a combat log violation. */
export const combatLogFlagIncrement = 1;
/** @type {string} Localization key for the admin notification message on combat log detection. */
export const combatLogMessage = "message.combatLogAdminNotify";

// TPA System
/** @type {boolean} If true, the TPA (Teleport Ask) system is enabled. */
export const enableTPASystem = false;
/** @type {number} Seconds a TPA request remains valid before automatically expiring. */
export const TPARequestTimeoutSeconds = 60;
/** @type {number} Seconds a player must wait between sending TPA requests. */
export const TPARequestCooldownSeconds = 10;
/** @type {number} Seconds of warmup before a player is teleported after a TPA request is accepted. Movement or damage cancels it. */
export const TPATeleportWarmupSeconds = 10;

// Server Info & Links
/** @type {string} Link to the server's Discord. Displayed in help or server info commands. */
export const discordLink = "https://discord.gg/example";
/** @type {string} Link to the server's website. */
export const websiteLink = "https://example.com";
/** @type {Array<{title: string, url: string}>} Array of objects defining helpful links (e.g., for rules, reporting). */
export const helpLinks = [
    { title: "Our Discord Server", url: "https://discord.gg/YourInviteCode" },
    { title: "Website/Forums", url: "https://yourwebsite.com/forums" },
    { title: "Report a Player", url: "https://yourwebsite.com/report" }
];
/** @type {string[]} Array of localization keys for general help messages. */
export const generalHelpMessages = [
    "message.generalHelp.welcome",
    "message.generalHelp.helpCommandPrompt",
    "message.generalHelp.reportPrompt",
    "message.generalHelp.rulesPrompt"
];

// Logging
/** @type {boolean} If true, enables detailed logging of player join and leave events to the console. */
export const enableDetailedJoinLeaveLogging = true;

// Chat Checks
/** @type {boolean} If true, enables the Swear Word detection check. */
export const enableSwearCheck = false;
/** @type {string[]} List of swear words to detect (case-insensitive, whole word). */
export const swearWordList = [];
/** @type {string} Duration for the mute applied on swear word detection (e.g., "30s", "5m", "1h"). */
export const swearCheckMuteDuration = "30s";

/** @type {boolean} If true, enables the basic anti-advertising check in chat. */
export const enableAntiAdvertisingCheck = true;
/** @type {string[]} List of string patterns to detect potential advertisements. */
export const antiAdvertisingPatterns = ["http://", "https://", "www.", ".com", ".net", ".org", ".gg", ".tk", ".co", ".uk", ".biz", ".info", ".io", ".me", ".tv", ".us", ".ws", ".club", ".store", ".online", ".site", ".xyz", ".shop", "discord.gg/", "joinmc.", "playmc.", "server."];
/** @type {string} The action profile name for advertising violations. */
export const antiAdvertisingActionProfileName = "chatAdvertisingDetected";

/** @type {boolean} If true, enables advanced regex-based link detection and whitelisting. */
export const enableAdvancedLinkDetection = false; // Default to false initially
/** @type {string[]} List of regex strings for advanced link detection. */
export const advancedLinkRegexList = [
    "https?://(?:[a-zA-Z0-9\\-_]+\\.)+[a-zA-Z]{2,}(?::\\d+)?(?:/[^\\s]*)?",
    "www\\.(?:[a-zA-Z0-9\\-_]+\\.)+[a-zA-Z]{2,}(?::\\d+)?(?:/[^\\s]*)?",
    "\\b(?:[a-zA-Z0-9\\-_]+\\.)+(com|net|org|gg|io|me|tv|us|uk|biz|info|club|store|online|site|xyz|shop|network|info|website|co|dev|app|online|xyz|tech|space|store|fun|press|host|art|blog|cafe|pics|live|life|news|ninja|cool|guru|gallery|city|country|link|click|buzz|stream|tube|chat|community|forum|group|page|fans|media|show|studio|style|video|software|pictures|graphics|game|games|server|play|mc|srv|network|gaming|fun|pro|services|shop|store|center|solutions|support|tech|tools|systems|cloud|digital|data|security|hosting|design|dev|app|api|network|community|forum|blog|news|media|studio|graphics|gallery|live|life|video|stream|tube|chat|page|fans|show|style|center|solutions|support|systems|cloud|digital|data|security|hosting|design|dev|app|api)(\\b|/[^\\s]*)",
    "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}(?::\\d+)?(?:/[^\\s]*)?\\b"
];
/** @type {string[]} List of patterns (strings or regex strings) to whitelist from advertising flags. */
export const advertisingWhitelistPatterns = []; // Example: ["myserver\\.com", "discord\\.gg/myinvite"]

/** @type {boolean} If true, enables the check for excessive capitalization (CAPS abuse) in chat. */
export const enableCapsCheck = true;
/** @type {number} The minimum message length for the CAPS abuse check to apply. */
export const capsCheckMinLength = 10;
/** @type {number} The percentage (0-100) of uppercase letters to trigger a CAPS abuse flag. */
export const capsCheckUpperCasePercentage = 70;
/** @type {string} The action profile name for CAPS abuse violations. */
export const capsCheckActionProfileName = "chat_caps_abuse_detected";

/** @type {boolean} If true, enables the check for excessive character repetition in chat. */
export const enableCharRepeatCheck = true;
/** @type {number} The minimum message length for the character repeat check to apply. */
export const charRepeatMinLength = 10;
/** @type {number} The minimum number of identical consecutive characters to trigger a flag. */
export const charRepeatThreshold = 6;
/** @type {string} The action profile name for character repeat violations. */
export const charRepeatActionProfileName = "chat_char_repeat_detected";

/** @type {boolean} If true, enables the check for excessive symbol usage in chat. */
export const enableSymbolSpamCheck = true;
/** @type {number} The minimum message length for the symbol spam check to apply. */
export const symbolSpamMinLength = 10;
/** @type {number} The percentage (0-100) of non-alphanumeric characters to trigger a symbol spam flag. */
export const symbolSpamPercentage = 50;
/** @type {string} The action profile name for symbol spam violations. */
export const symbolSpamActionProfileName = "chat_symbol_spam_detected";

// AntiGrief - TNT
/** @type {boolean} If true, enables anti-grief measures for TNT placement. */
export const enableTntAntiGrief = false;
/** @type {boolean} If true, admins (identified by `adminTag`) can place TNT without restriction. */
export const allowAdminTntPlacement = true;
/** @type {string} Action to take when unauthorized TNT placement is detected ("remove", "warn", "flag_only"). */
export const tntPlacementAction = "remove";

// AntiGrief - Wither
/** @type {boolean} If true, enables anti-grief measures for Wither spawning. */
export const enableWitherAntiGrief = false;
/** @type {boolean} If true, admins can spawn Withers without restriction. */
export const allowAdminWitherSpawn = true;
/** @type {string} Action for unauthorized Wither spawn ("prevent", "kill", "warn", "flag_only"). */
export const witherSpawnAction = "prevent";

// AntiGrief - Fire
/** @type {boolean} If true, enables anti-grief measures for fire spread/placement. */
export const enableFireAntiGrief = false;
/** @type {boolean} If true, admins can create fire without restriction. */
export const allowAdminFire = true;
/** @type {string} Action for unauthorized fire ("extinguish", "warn", "flag_only"). */
export const fireControlAction = "extinguish";

// AntiGrief - Lava
/** @type {boolean} If true, enables anti-grief measures for lava placement. */
export const enableLavaAntiGrief = false;
/** @type {boolean} If true, admins can place lava without restriction. */
export const allowAdminLava = true;
/** @type {string} Action for unauthorized lava placement ("remove", "warn", "flag_only"). */
export const lavaPlacementAction = "remove";

// AntiGrief - Water
/** @type {boolean} If true, enables anti-grief measures for water placement. */
export const enableWaterAntiGrief = false;
/** @type {boolean} If true, admins can place water without restriction. */
export const allowAdminWater = true;
/** @type {string} Action for unauthorized water placement ("remove", "warn", "flag_only"). */
export const waterPlacementAction = "remove";

// AntiGrief - Block Spam (Rate)
/** @type {boolean} If true, enables detection of rapid block placement (block spam by rate). */
export const enableBlockSpamAntiGrief = false;
/** @type {boolean} If true, players in Creative mode bypass the block spam (rate) check. */
export const blockSpamBypassInCreative = true;
/** @type {number} Time window in milliseconds to count blocks for rate-based spam detection. */
export const blockSpamTimeWindowMs = 1000;
/** @type {number} Maximum number of blocks allowed to be placed within `blockSpamTimeWindowMs`. */
export const blockSpamMaxBlocksInWindow = 8;
/** @type {string[]} Specific block types to monitor for rate-based spam. Empty array means all blocks. */
export const blockSpamMonitoredBlockTypes = ["minecraft:dirt", "minecraft:cobblestone", "minecraft:netherrack", "minecraft:sand", "minecraft:gravel"];
/** @type {string} Action for block spam (rate) violation ("warn", "flag_only", "kick"). */
export const blockSpamAction = "warn";

// AntiGrief - Entity Spam
/** @type {boolean} If true, enables detection of rapid entity spawning. */
export const enableEntitySpamAntiGrief = false;
/** @type {boolean} If true, players in Creative mode bypass the entity spam check. */
export const entitySpamBypassInCreative = true;
/** @type {number} Time window in milliseconds to count entities for spam detection. */
export const entitySpamTimeWindowMs = 2000;
/** @type {number} Maximum number of specified entities allowed to be spawned within `entitySpamTimeWindowMs`. */
export const entitySpamMaxSpawnsInWindow = 5;
/** @type {string[]} Specific entity types to monitor for spam. */
export const entitySpamMonitoredEntityTypes = ["minecraft:boat", "minecraft:armor_stand", "minecraft:item_frame", "minecraft:minecart", "minecraft:snow_golem", "minecraft:iron_golem"];
/** @type {string} Action for entity spam violation ("kill", "warn", "flag_only"). */
export const entitySpamAction = "kill";

// AntiGrief - Block Spam (Density)
/** @type {boolean} If true, enables detection of high-density block placement. */
export const enableBlockSpamDensityCheck = false;
/** @type {string[]} Specific block types to monitor for density-based spam. Empty means all. */
export const blockSpamDensityMonitoredBlockTypes = ["minecraft:dirt", "minecraft:cobblestone", "minecraft:netherrack", "minecraft:sand", "minecraft:gravel"];
/** @type {string} Action for block spam (density) violation ("warn", "flag_only"). */
export const blockSpamDensityAction = "warn";

// Piston Lag Check
/** @type {boolean} If true, enables monitoring of rapid piston activations to detect potential lag machines. */
export const enablePistonLagCheck = false;
/** @type {number} Activations per second of a single piston to trigger logging/alert. */
export const pistonActivationLogThresholdPerSecond = 15;
/** @type {number} Duration in seconds piston activity must be sustained above threshold to trigger. */
export const pistonActivationSustainedDurationSeconds = 3;
/** @type {number} Cooldown in seconds before logging/alerting for the same piston again. */
export const pistonLagLogCooldownSeconds = 60;

// World Border System (User-Facing Parts)
/** @type {boolean} Master switch for the entire World Border feature. */
export const enableWorldBorderSystem = false;
/** @type {string} Localization key for the warning message shown to players approaching the border. */
export const worldBorderWarningMessage = "message.worldBorderWarning";
/** @type {boolean} Default setting for whether players take damage when outside the world border. */
export const worldBorderDefaultEnableDamage = false;
/** @type {number} Default damage amount per interval for players outside the border. */
export const worldBorderDefaultDamageAmount = 0.5;
/** @type {number} Default interval in game ticks at which damage is applied. */
export const worldBorderDefaultDamageIntervalTicks = 20;
/** @type {number} Number of damage events after which a player is teleported back inside. */
export const worldBorderTeleportAfterNumDamageEvents = 30;
/** @type {boolean} If true, enables visual particle effects for the world border. */
export const worldBorderEnableVisuals = false;
/** @type {string} Default particle type ID for the world border visual effect. */
export const worldBorderParticleName = "minecraft:end_rod";
/** @type {number} Visual range in blocks from the border where particles may appear. */
export const worldBorderVisualRange = 24;
/** @type {number} Density of particles for the visual effect. Higher is denser. */
export const worldBorderParticleDensity = 1;
/** @type {number} Height in blocks of the particle wall visual. */
export const worldBorderParticleWallHeight = 4;
/** @type {number} Length in blocks of each segment of the particle wall. */
export const worldBorderParticleSegmentLength = 32;
/** @type {number} Interval in game ticks at which world border visuals are updated. */
export const worldBorderVisualUpdateIntervalTicks = 10;
/** @type {string[]} If populated, visuals cycle through these particles. Overrides `worldBorderParticleName`. */
export const worldBorderParticleSequence = [];
/** @type {boolean} If true, enables pulsing density effect for border visuals. */
export const worldBorderEnablePulsingDensity = false;
/** @type {number} Minimum particle density multiplier for pulsing effect. */
export const worldBorderPulseDensityMin = 0.5;
/** @type {number} Maximum particle density multiplier for pulsing effect. */
export const worldBorderPulseDensityMax = 1.5;
/** @type {number} Speed of the pulsing effect. Higher is faster. */
export const worldBorderPulseSpeed = 1.0;

// X-Ray Detection Notifications
/** @type {boolean} If true, admins are notified when players mine valuable ores. */
export const xrayDetectionNotifyOnOreMineEnabled = true;
/** @type {string[]} List of block type IDs monitored for X-Ray mining notifications. */
export const xrayDetectionMonitoredOres = ["minecraft:diamond_ore", "minecraft:deepslate_diamond_ore", "minecraft:ancient_debris"];
/** @type {boolean} If true, admins receive X-Ray notifications by default (can be toggled per admin). */
export const xrayDetectionAdminNotifyByDefault = true;

// Chat Formatting
/** @type {string} Chat prefix color for Owner rank. */
export const chatFormatOwnerPrefixColor = "§c";
/** @type {string} Name color for Owner rank. */
export const chatFormatOwnerNameColor = "§c";
/** @type {string} Message color for Owner rank. */
export const chatFormatOwnerMessageColor = "§f";
/** @type {string} Chat prefix color for Admin rank. */
export const chatFormatAdminPrefixColor = "§b";
/** @type {string} Name color for Admin rank. */
export const chatFormatAdminNameColor = "§b";
/** @type {string} Message color for Admin rank. */
export const chatFormatAdminMessageColor = "§f";
/** @type {string} Chat prefix color for Member rank. */
export const chatFormatMemberPrefixColor = "§7";
/** @type {string} Name color for Member rank. */
export const chatFormatMemberNameColor = "§7";
/** @type {string} Message color for Member rank. */
export const chatFormatMemberMessageColor = "§f";


export const commandSettings = {
    version: { enabled: true },
    myflags: { enabled: true },
    testnotify: { enabled: true },
    kick: { enabled: true },
    clearchat: { enabled: true },
    inspect: { enabled: true },
    warnings: { enabled: true },
    resetflags: { enabled: true },
    rules: { enabled: true },
    vanish: { enabled: true },
    freeze: { enabled: true },
    mute: { enabled: true },
    unmute: { enabled: true },
    ban: { enabled: true },
    unban: { enabled: true },
    gmc: { enabled: true },
    gms: { enabled: true },
    gma: { enabled: true },
    gmsp: { enabled: true },
    help: { enabled: true },
    invsee: { enabled: true },
    panel: { enabled: true },
    notify: { enabled: true },
    xraynotify: { enabled: true },
    tpa: { enabled: true },
    tpaccept: { enabled: true },
    tpacancel: { enabled: true },
    tpahere: { enabled: true },
    tpastatus: { enabled: true },
    tp: { enabled: true },
    copyinv: { enabled: true },
    uinfo: { enabled: true },
    netherlock: { enabled: true },
    endlock: { enabled: true },
    worldborder: { enabled: true },
    setlang: { enabled: true }
};

/** @type {boolean} If true, the Automated Moderation system is active. */
export const enableAutoMod = false;

/**
 * @type {string[]} Defines the server rules to be displayed to players.
 */
export const serverRules = [
    "Rule 1: Be respectful to all players and staff.",
    "Rule 2: No cheating, exploiting, or using unauthorized modifications.",
    "Rule 3: Do not spam chat or use excessive caps/symbols.",
    "Rule 4: Follow instructions from server administrators and moderators.",
    "Rule 5: Keep chat appropriate and avoid offensive language.",
    "Rule 6: Have fun and contribute to a positive community!"
];

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
/** @type {string[]} List of block type IDs that mitigate fall damage (e.g., hay_block). */
export const noFallMitigationBlocks = ["minecraft:hay_block", "minecraft:powder_snow", "minecraft:sweet_berry_bush"];

/** @type {boolean} If true, the NoSlow check (detecting movement speed reduction bypass) is active. */
export const enableNoSlowCheck = false;
// export const noSlowSpeedEffectTolerance = 0.5; // Deprecated: Flat tolerance for Speed effect with NoSlow. Use noSlowSpeedEffectTolerancePercent.
/** @type {number} Percentage (0.0 to 1.0) of additional speed allowed if player has Speed effect, relative to the action's max speed. E.g., 0.10 for 10% buffer. */
export const noSlowSpeedEffectTolerancePercent = 0.10;
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
/** @type {number} Minimum food level (inclusive) required to sprint. Vanilla default is > 6 (i.e., 7 or more). */
export const sprintHungerLimit = 6;


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

/** @type {string} The action profile name for swear word violations. */
export const swearCheckActionProfileName = "chat_swear_violation";

/** @type {boolean} If true, the Fast Message Spam check is active. */
export const enableFastMessageSpamCheck = true;
/** @type {number} Minimum time in milliseconds that must pass between messages to avoid being considered spam. */
export const fastMessageSpamThresholdMs = 500;
/** @type {string} The action profile name (from `checkActionProfiles`) to use for fast message spam violations. */
export const fastMessageSPAMActionProfileName = "chatSpamFastMessage";

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
export const spamRepeatFlagPlayer = false; // Changed to false as per new policy
/** @type {boolean} If true, cancels the message that triggers repeated spam detection. */
export const spamRepeatCancelMessage = false;

/** @type {boolean} If true, the Chat Content Repeat check is active. */
export const enableChatContentRepeatCheck = false;
/** @type {boolean} If true, the Unicode Abuse (Zalgo/diacritics) check is active. */
export const enableUnicodeAbuseCheck = false;

/** @type {boolean} If true, the Gibberish Chat check is active. */
export const enableGibberishCheck = false;
/** @type {number} Minimum message length to apply gibberish check. */
export const gibberishMinMessageLength = 10;
/** @type {number} Minimum ratio of alphabetic characters (0-1) for gibberish check to apply. */
export const gibberishMinAlphaRatio = 0.6;
/** @type {number} Lower bound for vowel ratio (0-1) to flag as gibberish. */
export const gibberishVowelRatioLowerBound = 0.15;
/** @type {number} Upper bound for vowel ratio (0-1) to flag as gibberish. */
export const gibberishVowelRatioUpperBound = 0.80;
/** @type {number} Maximum number of consecutive consonants to flag as gibberish. */
export const gibberishMaxConsecutiveConsonants = 5;
/** @type {string} Action profile name for gibberish violations. */
export const gibberishActionProfileName = "chatGibberish";

/** @type {boolean} If true, the Excessive Mentions chat check is active. */
export const enableExcessiveMentionsCheck = false;
/** @type {number} Minimum message length to apply excessive mentions check. */
export const mentionsMinMessageLength = 10;
/** @type {number} Maximum number of unique users that can be mentioned in a single message. */
export const mentionsMaxUniquePerMessage = 4;
/** @type {number} Maximum number of times a single user can be mentioned in a single message. */
export const mentionsMaxRepeatedPerMessage = 3;
/** @type {string} Action profile name for excessive mention violations. */
export const mentionsActionProfileName = "chatExcessiveMentions";

/** @type {boolean} If true, the Simple Impersonation (mimicking server/staff messages) check is active. */
export const enableSimpleImpersonationCheck = false;
/** @type {string[]} Regex patterns to identify server/staff message impersonation attempts. */
export const impersonationServerMessagePatterns = [
    "^\[(Server|Admin|System|Mod|Staff|Broadcast|Announcement|Alert)\]",
    "^§[4c][\\s\\S]*?(Warning|Critical|Error)",
    "^§[b9ea][\\s\\S]*?(Notice|Info|Server|System)"
];
/** @type {number} Permission level at or below which players are exempt from impersonation checks. */
export const impersonationExemptPermissionLevel = 1; // Assuming 1 is Admin or similar, adjust if needed based on rankManager.permissionLevels
/** @type {number} Minimum message length for impersonation pattern matching to apply. */
export const impersonationMinMessageLengthForPatternMatch = 10;
/** @type {string} Action profile name for impersonation attempt violations. */
export const impersonationActionProfileName = "chatImpersonationAttempt";

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

// --- World Border System ---
// --- Chat Behavior Checks ---
/** @type {boolean} If true, the Chat During Combat check is active. */
export const enableChatDuringCombatCheck = true;
/** @type {number} Seconds after the last combat interaction during which a player cannot chat. */
export const chatDuringCombatCooldownSeconds = 4;
/** @type {boolean} If true, the Chat During Item Use check is active. */
export const enableChatDuringItemUseCheck = true;

// --- Tick Interval Configurations for Checks ---
/** @type {number} Interval in game ticks for NameSpoof check. (100 ticks = 5 seconds) */
export const nameSpoofCheckIntervalTicks = 100;
/** @type {number} Interval in game ticks for AntiGMC check. (40 ticks = 2 seconds) */
export const antiGMCCheckIntervalTicks = 40;
/** @type {number} Interval in game ticks for NetherRoof check. (60 ticks = 3 seconds) */
export const netherRoofCheckIntervalTicks = 60;
/** @type {number} Interval in game ticks for AutoTool check. (10 ticks = 0.5 seconds) */
export const autoToolCheckIntervalTicks = 10;
/** @type {number} Interval in game ticks for FlatRotationBuilding check. (10 ticks = 0.5 seconds) */
export const flatRotationCheckIntervalTicks = 10;


// --- Chat Formatting Settings ---
/** @type {string} Default color for the Owner rank's chat prefix. */
// --- System ---
/**
 * @type {string}
 * The current version of the AntiCheat system.
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
    commandSettings: commandSettings,
    serverRules: serverRules,
    adminTag: adminTag,
    ownerPlayerName: ownerPlayerName,
    enableDebugLogging: enableDebugLogging,
    prefix: prefix,
    defaultServerLanguage: defaultServerLanguage,
    enableWelcomerMessage: enableWelcomerMessage,
    welcomeMessage: welcomeMessage,
    notifyAdminOnNewPlayerJoin: notifyAdminOnNewPlayerJoin,
    enableDeathCoordsMessage: enableDeathCoordsMessage,
    deathCoordsMessage: deathCoordsMessage,
    enableCombatLogDetection: enableCombatLogDetection,
    combatLogThresholdSeconds: combatLogThresholdSeconds,
    combatLogFlagIncrement: combatLogFlagIncrement,
    combatLogMessage: combatLogMessage,
    enableTPASystem: enableTPASystem,
    TPARequestTimeoutSeconds: TPARequestTimeoutSeconds,
    TPARequestCooldownSeconds: TPARequestCooldownSeconds,
    TPATeleportWarmupSeconds: TPATeleportWarmupSeconds,
    discordLink: discordLink,
    websiteLink: websiteLink,
    helpLinks: helpLinks,
    generalHelpMessages: generalHelpMessages,
    enableDetailedJoinLeaveLogging: enableDetailedJoinLeaveLogging,
    enableSwearCheck: enableSwearCheck,
    swearWordList: swearWordList,
    swearCheckMuteDuration: swearCheckMuteDuration,
    enableAntiAdvertisingCheck: enableAntiAdvertisingCheck,
    antiAdvertisingPatterns: antiAdvertisingPatterns,
    antiAdvertisingActionProfileName: antiAdvertisingActionProfileName, // Corrected source
    enableAdvancedLinkDetection: enableAdvancedLinkDetection,
    advancedLinkRegexList: advancedLinkRegexList,
    advertisingWhitelistPatterns: advertisingWhitelistPatterns,
    enableCapsCheck: enableCapsCheck,
    capsCheckMinLength: capsCheckMinLength,
    capsCheckUpperCasePercentage: capsCheckUpperCasePercentage,
    capsCheckActionProfileName: capsCheckActionProfileName,
    enableCharRepeatCheck: enableCharRepeatCheck,
    charRepeatMinLength: charRepeatMinLength,
    charRepeatThreshold: charRepeatThreshold,
    charRepeatActionProfileName: charRepeatActionProfileName,
    enableSymbolSpamCheck: enableSymbolSpamCheck,
    symbolSpamMinLength: symbolSpamMinLength,
    symbolSpamPercentage: symbolSpamPercentage,
    symbolSpamActionProfileName: symbolSpamActionProfileName,
    enableTntAntiGrief: enableTntAntiGrief,
    allowAdminTntPlacement: allowAdminTntPlacement,
    tntPlacementAction: tntPlacementAction,
    enableWitherAntiGrief: enableWitherAntiGrief,
    allowAdminWitherSpawn: allowAdminWitherSpawn,
    witherSpawnAction: witherSpawnAction,
    enableFireAntiGrief: enableFireAntiGrief,
    allowAdminFire: allowAdminFire,
    fireControlAction: fireControlAction,
    enableLavaAntiGrief: enableLavaAntiGrief,
    allowAdminLava: allowAdminLava,
    lavaPlacementAction: lavaPlacementAction,
    enableWaterAntiGrief: enableWaterAntiGrief,
    allowAdminWater: allowAdminWater,
    waterPlacementAction: waterPlacementAction,
    enableBlockSpamAntiGrief: enableBlockSpamAntiGrief,
    blockSpamBypassInCreative: blockSpamBypassInCreative,
    blockSpamTimeWindowMs: blockSpamTimeWindowMs,
    blockSpamMaxBlocksInWindow: blockSpamMaxBlocksInWindow,
    blockSpamMonitoredBlockTypes: blockSpamMonitoredBlockTypes,
    blockSpamAction: blockSpamAction,
    enableEntitySpamAntiGrief: enableEntitySpamAntiGrief,
    entitySpamBypassInCreative: entitySpamBypassInCreative,
    entitySpamTimeWindowMs: entitySpamTimeWindowMs,
    entitySpamMaxSpawnsInWindow: entitySpamMaxSpawnsInWindow,
    entitySpamMonitoredEntityTypes: entitySpamMonitoredEntityTypes,
    entitySpamAction: entitySpamAction,
    enableBlockSpamDensityCheck: enableBlockSpamDensityCheck,
    blockSpamDensityMonitoredBlockTypes: blockSpamDensityMonitoredBlockTypes,
    blockSpamDensityAction: blockSpamDensityAction,
    enablePistonLagCheck: enablePistonLagCheck,
    pistonActivationLogThresholdPerSecond: pistonActivationLogThresholdPerSecond,
    pistonActivationSustainedDurationSeconds: pistonActivationSustainedDurationSeconds,
    pistonLagLogCooldownSeconds: pistonLagLogCooldownSeconds,
    enableWorldBorderSystem: enableWorldBorderSystem,
    worldBorderWarningMessage: worldBorderWarningMessage,
    worldBorderDefaultEnableDamage: worldBorderDefaultEnableDamage,
    worldBorderDefaultDamageAmount: worldBorderDefaultDamageAmount,
    worldBorderDefaultDamageIntervalTicks: worldBorderDefaultDamageIntervalTicks,
    worldBorderTeleportAfterNumDamageEvents: worldBorderTeleportAfterNumDamageEvents,
    worldBorderEnableVisuals: worldBorderEnableVisuals,
    worldBorderParticleName: worldBorderParticleName,
    worldBorderVisualRange: worldBorderVisualRange,
    worldBorderParticleDensity: worldBorderParticleDensity,
    worldBorderParticleWallHeight: worldBorderParticleWallHeight,
    worldBorderParticleSegmentLength: worldBorderParticleSegmentLength,
    worldBorderVisualUpdateIntervalTicks: worldBorderVisualUpdateIntervalTicks,
    worldBorderParticleSequence: worldBorderParticleSequence,
    worldBorderEnablePulsingDensity: worldBorderEnablePulsingDensity,
    worldBorderPulseDensityMin: worldBorderPulseDensityMin,
    worldBorderPulseDensityMax: worldBorderPulseDensityMax,
    worldBorderPulseSpeed: worldBorderPulseSpeed,
    xrayDetectionNotifyOnOreMineEnabled: xrayDetectionNotifyOnOreMineEnabled,
    xrayDetectionMonitoredOres: xrayDetectionMonitoredOres,
    xrayDetectionAdminNotifyByDefault: xrayDetectionAdminNotifyByDefault,
    chatFormatOwnerPrefixColor: chatFormatOwnerPrefixColor,
    chatFormatOwnerNameColor: chatFormatOwnerNameColor,
    chatFormatOwnerMessageColor: chatFormatOwnerMessageColor,
    chatFormatAdminPrefixColor: chatFormatAdminPrefixColor,
    chatFormatAdminNameColor: chatFormatAdminNameColor,
    chatFormatAdminMessageColor: chatFormatAdminMessageColor,
    chatFormatMemberPrefixColor: chatFormatMemberPrefixColor,
    chatFormatMemberNameColor: chatFormatMemberNameColor,
    chatFormatMemberMessageColor: chatFormatMemberMessageColor,
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
    sprintHungerLimit,
    // noSlowSpeedEffectTolerance, // Deprecated
    noSlowSpeedEffectTolerancePercent,
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
    noFallMitigationBlocks, // Added for noFallCheck
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
    enableDeathEffects,
    deathEffectParticleName,
    deathEffectSoundId,
    defaultDeathEffect,
    maxPlayerStartedFires,
    fireSpreadDurationLimit,
    blockSpamDensityCheckRadius,
    blockSpamDensityTimeWindowTicks,
    blockSpamDensityThresholdPercentage,
    maxAllowedClientRenderDistance,
    enableChatDuringCombatCheck,
    chatDuringCombatCooldownSeconds,
    enableChatDuringItemUseCheck,
    // New interval ticks
    nameSpoofCheckIntervalTicks,
    antiGMCCheckIntervalTicks,
    netherRoofCheckIntervalTicks,
    autoToolCheckIntervalTicks,
    flatRotationCheckIntervalTicks,
    enableChatContentRepeatCheck,
    enableUnicodeAbuseCheck,
    enableGibberishCheck,
    gibberishMinMessageLength,
    gibberishMinAlphaRatio,
    gibberishVowelRatioLowerBound,
    gibberishVowelRatioUpperBound,
    gibberishMaxConsecutiveConsonants,
    gibberishActionProfileName,
    enableExcessiveMentionsCheck,
    mentionsMinMessageLength,
    mentionsMaxUniquePerMessage,
    mentionsMaxRepeatedPerMessage,
    mentionsActionProfileName,
    swearCheckActionProfileName,
    automodConfig: importedAutoModConfig,
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
        // MODIFIED LOGIC FOR STRING ARRAY FROM COMMA-SEPARATED STRING
        if (newValue.trim() === "") {
            coercedNewValue = [];
        } else {
            coercedNewValue = newValue.split(',').map(item => item.trim());
        }
        // No longer rejecting here, coercedNewValue is now an array.
        // The function will proceed to the general type check.
    }

    // --- NEW STRICT ARRAY CHECK START ---
    // This check is after all coercions. If oldValue was array, coercedNewValue must also be an array.
    if (Array.isArray(oldValue) && !Array.isArray(coercedNewValue)) {
        console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected array, but received incompatible type ${typeof newValue} (which resolved to type ${typeof coercedNewValue} after coercion attempts). Update rejected.`);
        return false;
    }
    // --- NEW STRICT ARRAY CHECK END ---
     else if (typeof oldValue !== typeof coercedNewValue && !Array.isArray(oldValue)) { // Allow assigning new array to array type
        // This check should correctly skip if oldValue was an array and coercedNewValue is now also an array.
        // It primarily handles cases where oldValue was not an array, but there's still a type mismatch.
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

[end of AntiCheatsBP/scripts/config.js]
