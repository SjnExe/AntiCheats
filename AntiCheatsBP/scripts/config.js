// Anti-Cheat Configuration File
import { checkActionProfiles } from './core/actionProfiles.js';
import { automodConfig as importedAutoModConfig } from './core/automodConfig.js';

// General Admin & System
/** @type {string} The tag for identifying admin players. */
export const adminTag = "admin";
/** @type {string} The exact name of the server owner. Required for owner-level commands/features. */
export const ownerPlayerName = "PlayerNameHere";
export const enableDebugLogging = true; // If true, enables detailed debug logging to console.
/** @type {string} The prefix for chat-based commands (e.g., "!", "."). */
export const prefix = "!";

// Welcomer & Player Info
export const enableWelcomerMessage = true; // If true, a welcome message is sent to players when they join.
/** @type {string} The welcome message. Placeholders: {playerName} */
export const welcomeMessage = "Welcome, {playerName}, to our amazing server! We're glad to have you.";
export const notifyAdminOnNewPlayerJoin = true; // If true, admins are notified when a new player joins for the first time.
export const enableDeathCoordsMessage = true; // If true, players are sent their death coordinates upon respawning.
/** @type {string} The death coordinates message. Placeholders: {x}, {y}, {z}, {dimensionId} */
export const deathCoordsMessage = "§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.";

// Combat Log
export const enableCombatLogDetection = false; // If true, enables detection of players leaving shortly after combat.
/** @type {number} Seconds after last combat interaction within which leaving is considered combat logging. */
export const combatLogThresholdSeconds = 15;
export const combatLogFlagIncrement = 1; // Number of flags to add for a combat log violation.
/** @type {string} The admin notification message on combat log detection. Placeholders: {playerName}, {timeSinceCombat}, {incrementAmount} */
export const combatLogMessage = "§c[CombatLog] §e{playerName}§c disconnected {timeSinceCombat}s after being in combat! Flags: +{incrementAmount}";

// TPA System
export const enableTPASystem = false; // If true, the TPA (Teleport Ask) system is enabled.
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
/** @type {string[]} Array of general help messages/tips. */
export const generalHelpMessages = [
    "Welcome to the server! Type !help for commands.",
    "Use !help for a list of commands.",
    "Report issues or players using !report.",
    "Type !rules to see the server rules."
];

// Logging
export const enableDetailedJoinLeaveLogging = true; // If true, enables detailed logging of player join and leave events to the console.

// Chat Checks
export const enableSwearCheck = false; // If true, enables the Swear Word detection check.
/** @type {string[]} List of swear words to detect (case-insensitive, whole word). */
export const swearWordList = [];
/** @type {string} Duration for the mute applied on swear word detection (e.g., "30s", "5m", "1h"). */
export const swearCheckMuteDuration = "30s";
export const enableAntiAdvertisingCheck = true; // If true, enables the basic anti-advertising check in chat.
/** @type {string[]} List of string patterns to detect potential advertisements. */
export const antiAdvertisingPatterns = ["http://", "https://", "www.", ".com", ".net", ".org", ".gg", ".tk", ".co", ".uk", ".biz", ".info", ".io", ".me", ".tv", ".us", ".ws", ".club", ".store", ".online", ".site", ".xyz", ".shop", "discord.gg/", "joinmc.", "playmc.", "server."];
export const antiAdvertisingActionProfileName = "chatAdvertisingDetected"; // The action profile name for advertising violations.
export const enableAdvancedLinkDetection = false; // If true, enables advanced regex-based link detection and whitelisting.
/** @type {string[]} List of regex strings for advanced link detection. */
export const advancedLinkRegexList = [
    "https?://(?:[a-zA-Z0-9\\-_]+\\.)+[a-zA-Z]{2,}(?::\\d+)?(?:/[^\\s]*)?",
    "www\\.(?:[a-zA-Z0-9\\-_]+\\.)+[a-zA-Z]{2,}(?::\\d+)?(?:/[^\\s]*)?",
    "\\b(?:[a-zA-Z0-9\\-_]+\\.)+(com|net|org|gg|io|me|tv|us|uk|biz|info|club|store|online|site|xyz|shop|network|info|website|co|dev|app|online|xyz|tech|space|store|fun|press|host|art|blog|cafe|pics|live|life|news|ninja|cool|guru|gallery|city|country|link|click|buzz|stream|tube|chat|community|forum|group|page|fans|media|show|studio|style|video|software|pictures|graphics|game|games|server|play|mc|srv|network|gaming|fun|pro|services|shop|store|center|solutions|support|tech|tools|systems|cloud|digital|data|security|hosting|design|dev|app|api|network|community|forum|blog|news|media|studio|graphics|gallery|live|life|video|stream|tube|chat|page|fans|show|style|center|solutions|support|systems|cloud|digital|data|security|hosting|design|dev|app|api)(\\b|/[^\\s]*)",
    "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}(?::\\d+)?(?:/[^\\s]*)?\\b"
];
/** @type {string[]} List of patterns (strings or regex strings) to whitelist from advertising flags. */
export const advertisingWhitelistPatterns = []; // Example: ["myserver\\.com", "discord\\.gg/myinvite"]
export const enableCapsCheck = true; // If true, enables the check for excessive capitalization (CAPS abuse) in chat.
/** @type {number} The minimum message length for the CAPS abuse check to apply. */
export const capsCheckMinLength = 10;
/** @type {number} The percentage (0-100) of uppercase letters to trigger a CAPS abuse flag. */
export const capsCheckUpperCasePercentage = 70;
export const capsCheckActionProfileName = "chat_caps_abuse_detected"; // The action profile name for CAPS abuse violations.
export const enableCharRepeatCheck = true; // If true, enables the check for excessive character repetition in chat.
/** @type {number} The minimum message length for the character repeat check to apply. */
export const charRepeatMinLength = 10;
/** @type {number} The minimum number of identical consecutive characters to trigger a flag. */
export const charRepeatThreshold = 6;
export const charRepeatActionProfileName = "chat_char_repeat_detected"; // The action profile name for character repeat violations.
export const enableSymbolSpamCheck = true; // If true, enables the check for excessive symbol usage in chat.
/** @type {number} The minimum message length for the symbol spam check to apply. */
export const symbolSpamMinLength = 10;
/** @type {number} The percentage (0-100) of non-alphanumeric characters to trigger a symbol spam flag. */
export const symbolSpamPercentage = 50;
export const symbolSpamActionProfileName = "chat_symbol_spam_detected"; // The action profile name for symbol spam violations.

// AntiGrief - TNT
export const enableTntAntiGrief = false; // If true, enables anti-grief measures for TNT placement.
export const allowAdminTntPlacement = true; // If true, admins (identified by `adminTag`) can place TNT without restriction.
/** @type {string} Action to take when unauthorized TNT placement is detected ("remove", "warn", "flag_only"). */
export const tntPlacementAction = "remove";

// AntiGrief - Wither
export const enableWitherAntiGrief = false; // If true, enables anti-grief measures for Wither spawning.
export const allowAdminWitherSpawn = true; // If true, admins can spawn Withers without restriction.
/** @type {string} Action for unauthorized Wither spawn ("prevent", "kill", "warn", "flag_only"). */
export const witherSpawnAction = "prevent";

// AntiGrief - Fire
export const enableFireAntiGrief = false; // If true, enables anti-grief measures for fire spread/placement.
export const allowAdminFire = true; // If true, admins can create fire without restriction.
/** @type {string} Action for unauthorized fire ("extinguish", "warn", "flag_only"). */
export const fireControlAction = "extinguish";

// AntiGrief - Lava
export const enableLavaAntiGrief = false; // If true, enables anti-grief measures for lava placement.
export const allowAdminLava = true; // If true, admins can place lava without restriction.
/** @type {string} Action for unauthorized lava placement ("remove", "warn", "flag_only"). */
export const lavaPlacementAction = "remove";

// AntiGrief - Water
export const enableWaterAntiGrief = false; // If true, enables anti-grief measures for water placement.
export const allowAdminWater = true; // If true, admins can place water without restriction.
/** @type {string} Action for unauthorized water placement ("remove", "warn", "flag_only"). */
export const waterPlacementAction = "remove";

// AntiGrief - Block Spam (Rate)
export const enableBlockSpamAntiGrief = false; // If true, enables detection of rapid block placement (block spam by rate).
export const blockSpamBypassInCreative = true; // If true, players in Creative mode bypass the block spam (rate) check.
/** @type {number} Time window in milliseconds to count blocks for rate-based spam detection. */
export const blockSpamTimeWindowMs = 1000;
/** @type {number} Maximum number of blocks allowed to be placed within `blockSpamTimeWindowMs`. */
export const blockSpamMaxBlocksInWindow = 8;
/** @type {string[]} Specific block types to monitor for rate-based spam. Empty array means all blocks. */
export const blockSpamMonitoredBlockTypes = ["minecraft:dirt", "minecraft:cobblestone", "minecraft:netherrack", "minecraft:sand", "minecraft:gravel"];
/** @type {string} Action for block spam (rate) violation ("warn", "flag_only", "kick"). */
export const blockSpamAction = "warn";

// AntiGrief - Entity Spam
export const enableEntitySpamAntiGrief = false; // If true, enables detection of rapid entity spawning.
export const entitySpamBypassInCreative = true; // If true, players in Creative mode bypass the entity spam check.
/** @type {number} Time window in milliseconds to count entities for spam detection. */
export const entitySpamTimeWindowMs = 2000;
/** @type {number} Maximum number of specified entities allowed to be spawned within `entitySpamTimeWindowMs`. */
export const entitySpamMaxSpawnsInWindow = 5;
/** @type {string[]} Specific entity types to monitor for spam. */
export const entitySpamMonitoredEntityTypes = ["minecraft:boat", "minecraft:armor_stand", "minecraft:item_frame", "minecraft:minecart", "minecraft:snow_golem", "minecraft:iron_golem"];
/** @type {string} Action for entity spam violation ("kill", "warn", "flag_only"). */
export const entitySpamAction = "kill";

// AntiGrief - Block Spam (Density)
export const enableBlockSpamDensityCheck = false; // If true, enables detection of high-density block placement.
/** @type {string[]} Specific block types to monitor for density-based spam. Empty means all. */
export const blockSpamDensityMonitoredBlockTypes = ["minecraft:dirt", "minecraft:cobblestone", "minecraft:netherrack", "minecraft:sand", "minecraft:gravel"];
/** @type {string} Action for block spam (density) violation ("warn", "flag_only"). */
export const blockSpamDensityAction = "warn";

// Piston Lag Check
export const enablePistonLagCheck = false; // If true, enables monitoring of rapid piston activations to detect potential lag machines.
/** @type {number} Activations per second of a single piston to trigger logging/alert. */
export const pistonActivationLogThresholdPerSecond = 15;
/** @type {number} Duration in seconds piston activity must be sustained above threshold to trigger. */
export const pistonActivationSustainedDurationSeconds = 3;
/** @type {number} Cooldown in seconds before logging/alerting for the same piston again. */
export const pistonLagLogCooldownSeconds = 60;

// World Border System (User-Facing Parts)
export const enableWorldBorderSystem = false; // Master switch for the entire World Border feature.
/** @type {string} Warning message shown to players approaching the border. */
export const worldBorderWarningMessage = "§cYou are approaching the world border!";
export const worldBorderDefaultEnableDamage = false; // Default setting for whether players take damage when outside the world border.
/** @type {number} Default damage amount per interval for players outside the border. */
export const worldBorderDefaultDamageAmount = 0.5;
/** @type {number} Default interval in game ticks at which damage is applied. */
export const worldBorderDefaultDamageIntervalTicks = 20;
/** @type {number} Number of damage events after which a player is teleported back inside. */
export const worldBorderTeleportAfterNumDamageEvents = 30;
export const worldBorderEnableVisuals = false; // If true, enables visual particle effects for the world border.
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
export const worldBorderEnablePulsingDensity = false; // If true, enables pulsing density effect for border visuals.
/** @type {number} Minimum particle density multiplier for pulsing effect. */
export const worldBorderPulseDensityMin = 0.5;
/** @type {number} Maximum particle density multiplier for pulsing effect. */
export const worldBorderPulseDensityMax = 1.5;
/** @type {number} Speed of the pulsing effect. Higher is faster. */
export const worldBorderPulseSpeed = 1.0;

// X-Ray Detection Notifications
export const xrayDetectionNotifyOnOreMineEnabled = true; // If true, admins are notified when players mine valuable ores.
/** @type {string[]} List of block type IDs monitored for X-Ray mining notifications. */
export const xrayDetectionMonitoredOres = ["minecraft:diamond_ore", "minecraft:deepslate_diamond_ore", "minecraft:ancient_debris"];
export const xrayDetectionAdminNotifyByDefault = true; // If true, admins receive X-Ray notifications by default (can be toggled per admin).

// Chat Formatting has been moved to ranksConfig.js

export const commandSettings = {
    version: { enabled: true }, myflags: { enabled: true }, testnotify: { enabled: true }, kick: { enabled: true },
    clearchat: { enabled: true }, inspect: { enabled: true }, warnings: { enabled: true }, resetflags: { enabled: true },
    rules: { enabled: true }, vanish: { enabled: true }, freeze: { enabled: true }, mute: { enabled: true },
    unmute: { enabled: true }, ban: { enabled: true }, unban: { enabled: true }, gmc: { enabled: true },
    gms: { enabled: true }, gma: { enabled: true }, gmsp: { enabled: true }, help: { enabled: true },
    invsee: { enabled: true }, panel: { enabled: true }, notify: { enabled: true }, xraynotify: { enabled: true },
    tpa: { enabled: true }, tpaccept: { enabled: true }, tpacancel: { enabled: true }, tpahere: { enabled: true },
    tpastatus: { enabled: true }, tp: { enabled: true }, copyinv: { enabled: true }, uinfo: { enabled: true },
    netherlock: { enabled: true }, endlock: { enabled: true }, worldborder: { enabled: true },
    setlang: { enabled: false } // Disabled setlang command
};

export const enableAutoMod = false; // If true, the Automated Moderation system is active.

/** @type {string[]} Defines the server rules to be displayed to players. */
export const serverRules = [
    "Rule 1: Be respectful to all players and staff.",
    "Rule 2: No cheating, exploiting, or using unauthorized modifications.",
    "Rule 3: Do not spam chat or use excessive caps/symbols.",
    "Rule 4: Follow instructions from server administrators and moderators.",
    "Rule 5: Keep chat appropriate and avoid offensive language.",
    "Rule 6: Have fun and contribute to a positive community!"
];

// --- General Check Toggles ---
export const enableReachCheck = true;
export const enableCPSCheck = true;
export const enableViewSnapCheck = true;
export const enableMultiTargetCheck = true;
export const enableStateConflictCheck = true;
export const enableFlyCheck = false;
export const enableSpeedCheck = false;
export const enableNofallCheck = true;
export const enableNukerCheck = false;
export const enableIllegalItemCheck = true;
export const enableSelfHurtCheck = true;
export const enableNetherRoofCheck = false;

// --- Movement Checks ---
/** @type {number} The Y-level at or above which a player in the Nether is considered to be on the roof. */
export const netherRoofYLevelThreshold = 128;
/** @type {number} Maximum vertical speed (positive for upward, negative for downward) in blocks per second. Used by Fly check. */
export const maxVerticalSpeed = 10;
/** @type {number} Maximum horizontal speed in blocks per second. Default vanilla sprint speed is ~5.6 blocks/sec. */
export const maxHorizontalSpeed = 15; // Example: Allow for speed effects up to Speed II
/** @type {number} Flat bonus to maximum horizontal speed (blocks/sec) added per level of the Speed effect. */
export const speedEffectBonus = 2.0; // Vanilla Speed I = +20%, Speed II = +40%. A flat bonus simplifies this.
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
export const enableNoSlowCheck = false; // If true, the NoSlow check (detecting movement speed reduction bypass) is active.
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
export const enableInvalidSprintCheck = true; // If true, the Invalid Sprint check (detecting sprinting under disallowed conditions) is active.
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
/** @type {string[]} Item type IDs for consumables (food, potions) that should prevent attacking while being actively used. */
export const attackBlockingConsumables = [
    "minecraft:apple", "minecraft:golden_apple", "minecraft:enchanted_golden_apple", "minecraft:mushroom_stew", "minecraft:rabbit_stew",
    "minecraft:beetroot_soup", "minecraft:suspicious_stew", "minecraft:cooked_beef", "minecraft:cooked_porkchop", "minecraft:cooked_mutton",
    "minecraft:cooked_chicken", "minecraft:cooked_rabbit", "minecraft:cooked_salmon", "minecraft:cooked_cod", "minecraft:baked_potato",
    "minecraft:bread", "minecraft:melon_slice", "minecraft:carrot", "minecraft:potato", "minecraft:beetroot", "minecraft:dried_kelp",
    "minecraft:potion", "minecraft:honey_bottle"
];
/** @type {string[]} Item type IDs for bows that should prevent attacking (other than firing the bow itself) while being charged. */
export const attackBlockingBows = ["minecraft:bow", "minecraft:crossbow"];
/** @type {string[]} Item type IDs for shields that should prevent attacking while being actively used (raised). */
export const attackBlockingShields = ["minecraft:shield"];
/** @type {number} Number of ticks an 'item use' state (e.g., `isUsingConsumable`) persists before auto-clearing if no explicit stop event. (20 ticks = 1 second). */
export const itemUseStateClearTicks = 60; // Default to 3 seconds

// --- World Checks ---
// --- AutoTool Check ---
export const enableAutoToolCheck = false; // If true, the AutoTool check is active.
/** @type {number} Maximum ticks between starting to break a block and switching to an optimal tool to be considered suspicious by AutoTool check. */
export const autoToolSwitchToOptimalWindowTicks = 2;
/** @type {number} Maximum ticks after breaking a block (with a switched optimal tool) to detect a switch back to a previous non-optimal tool, for AutoTool check. */
export const autoToolSwitchBackWindowTicks = 5;

// --- InstaBreak Check ---
export const enableInstaBreakUnbreakableCheck = false; // If true, the check for breaking normally unbreakable blocks is active.
/** @type {string[]} List of block type IDs considered normally unbreakable by non-Operator players. */
export const instaBreakUnbreakableBlocks = [
    "minecraft:bedrock", "minecraft:barrier", "minecraft:command_block", "minecraft:repeating_command_block",
    "minecraft:chain_command_block", "minecraft:structure_block", "minecraft:structure_void", "minecraft:jigsaw",
    "minecraft:light_block", "minecraft:end_portal_frame", "minecraft:end_gateway"
];
export const enableInstaBreakSpeedCheck = true; // If true, the check for breaking blocks significantly faster than vanilla capabilities is active.
/** @type {number} Tolerance in game ticks for block breaking speed. Actual break time must be less than (ExpectedTime - Tolerance) to flag. */
export const instaBreakTimeToleranceTicks = 2;

// --- Player Behavior Checks ---
export const enableNameSpoofCheck = true; // If true, the NameSpoof check is active.
/** @type {number} Maximum allowed length for a player's nameTag. Used by NameSpoof check. */
export const nameSpoofMaxLength = 48;
/** @type {string} Regular expression pattern for disallowed characters in player nameTags. */
export const nameSpoofDisallowedCharsRegex = "[\n\r\t\x00-\x1F\x7F-\x9F]";
/** @type {number} Minimum interval in game ticks between allowed player nameTag changes. Used by NameSpoof check. (200 ticks = 10 seconds) */
export const nameSpoofMinChangeIntervalTicks = 200;
export const enableAntiGMCCheck = true; // If true, the Anti-Gamemode Creative (Anti-GMC) check is active.
/** @type {string} The gamemode to switch players to if unauthorized Creative mode is detected and `antiGmcAutoSwitch` is true. */
export const antiGMCSwitchToGameMode = "survival";
export const antiGmcAutoSwitch = true; // If true, automatically switch a player's gamemode if unauthorized Creative mode is detected.
export const enableInventoryModCheck = false; // If true, Inventory Modification checks are active.
/** @type {number} Maximum number of blocks that can be broken within `nukerCheckIntervalMs` before flagging for Nuker. */
export const nukerMaxBreaksShortInterval = 4;
/** @type {number} Time window in milliseconds for the Nuker check to count broken blocks. */
export const nukerCheckIntervalMs = 200;
/** @type {string[]} Array of item type IDs banned from being placed by players. */
export const bannedItemsPlace = ["minecraft:command_block", "minecraft:moving_block"];
/** @type {string[]} Array of item type IDs banned from being used by players. */
export const bannedItemsUse = [];

// --- Chat Checks ---
export const swearCheckActionProfileName = "chat_swear_violation"; // The action profile name for swear word violations.
export const enableFastMessageSpamCheck = true; // If true, the Fast Message Spam check is active.
/** @type {number} Minimum time in milliseconds that must pass between messages to avoid being considered spam. */
export const fastMessageSpamThresholdMs = 500;
export const fastMessageSPAMActionProfileName = "chatSpamFastMessage"; // Action profile for fast message spam.
export const enableMaxWordsSpamCheck = true; // If true, the Max Words Spam check is active.
/** @type {number} Maximum allowed number of words in a single chat message. */
export const maxWordsSpamThreshold = 50;
export const maxWordsSPAMActionProfileName = "chat_spam_max_words"; // Action profile for max words spam.
export const enableNewlineCheck = true; // If true, checks for newline characters in chat.
export const flagOnNewline = true; // If true, flags player for using newlines.
export const cancelMessageOnNewline = true; // If true, cancels messages with newlines.
export const enableMaxMessageLengthCheck = true; // If true, checks if chat messages exceed `maxMessageLength`.
/** @type {number} Maximum allowed character length for a single chat message. */
export const maxMessageLength = 256;
export const flagOnMaxMessageLength = true; // If true, flags player for overly long messages.
export const cancelOnMaxMessageLength = true; // If true, cancels overly long messages.
export const spamRepeatCheckEnabled = true; // If true, checks for players sending the same messages repeatedly.
/** @type {number} Number of identical messages within `spamRepeatTimeWindowSeconds` to trigger a flag. */
export const spamRepeatMessageCount = 3;
/** @type {number} Time window in seconds to monitor for repeated messages. */
export const spamRepeatTimeWindowSeconds = 5;
export const spamRepeatFlagPlayer = false;
export const spamRepeatCancelMessage = false;
export const enableChatContentRepeatCheck = false; // If true, the Chat Content Repeat check is active.
export const enableUnicodeAbuseCheck = false; // If true, the Unicode Abuse (Zalgo/diacritics) check is active.
export const enableGibberishCheck = false; // If true, the Gibberish Chat check is active.
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
export const gibberishActionProfileName = "chatGibberish"; // Action profile name for gibberish violations.
export const enableExcessiveMentionsCheck = false; // If true, the Excessive Mentions chat check is active.
/** @type {number} Minimum message length to apply excessive mentions check. */
export const mentionsMinMessageLength = 10;
/** @type {number} Maximum number of unique users that can be mentioned in a single message. */
export const mentionsMaxUniquePerMessage = 4;
/** @type {number} Maximum number of times a single user can be mentioned in a single message. */
export const mentionsMaxRepeatedPerMessage = 3;
export const mentionsActionProfileName = "chatExcessiveMentions"; // Action profile name for excessive mention violations.
export const enableSimpleImpersonationCheck = false; // If true, the Simple Impersonation check is active.
/** @type {string[]} Regex patterns to identify server/staff message impersonation attempts. */
export const impersonationServerMessagePatterns = [
    "^\[(Server|Admin|System|Mod|Staff|Broadcast|Announcement|Alert)\]",
    "^§[4c][\\s\\S]*?(Warning|Critical|Error)",
    "^§[b9ea][\\s\\S]*?(Notice|Info|Server|System)"
];
/** @type {number} Permission level at or below which players are exempt from impersonation checks. */
export const impersonationExemptPermissionLevel = 1;
/** @type {number} Minimum message length for impersonation pattern matching to apply. */
export const impersonationMinMessageLengthForPatternMatch = 10;
export const impersonationActionProfileName = "chatImpersonationAttempt"; // Action profile name for impersonation.

// --- Scaffold/Tower Detection ---
export const enableTowerCheck = false; // If true, the Scaffold/Tower check is active.
/** @type {number} Maximum time in game ticks between consecutive upward pillar blocks. */
export const towerMaxTickGap = 10;
/** @type {number} Minimum number of consecutive upward blocks placed to trigger a tower flag. */
export const towerMinHeight = 5;
/** @type {number} Maximum pitch deviation (degrees) allowed while pillaring up. */
export const towerMaxPitchWhilePillaring = -30;
/** @type {number} How many recent block placements to store for pattern analysis. */
export const towerPlacementHistoryLength = 20;
export const enableFlatRotationCheck = false; // If true, the Flat/Invalid Rotation While Building check is active.
/** @type {number} Number of consecutive block placements to analyze for static or flat rotation patterns. */
export const flatRotationConsecutiveBlocks = 4;
/** @type {number} Maximum degrees of variance allowed for pitch over `flatRotationConsecutiveBlocks` to be 'static'. */
export const flatRotationMaxPitchVariance = 2.0;
/** @type {number} Maximum degrees of variance allowed for yaw over `flatRotationConsecutiveBlocks` to be 'static'. */
export const flatRotationMaxYawVariance = 2.0;
/** @type {number} Minimum pitch for 'flat horizontal' building detection. */
export const flatRotationPitchHorizontalMin = -5.0;
/** @type {number} Maximum pitch for 'flat horizontal' building detection. */
export const flatRotationPitchHorizontalMax = 5.0;
/** @type {number} Minimum pitch for 'flat downward' building detection. */
export const flatRotationPitchDownwardMin = -90.0;
/** @type {number} Maximum pitch for 'flat downward' building detection. */
export const flatRotationPitchDownwardMax = -85.0;
export const enableDownwardScaffoldCheck = false; // If true, the Downward Scaffold check is active.
/** @type {number} Minimum number of consecutive downward blocks placed while airborne to trigger a flag. */
export const downwardScaffoldMinBlocks = 3;
/** @type {number} Maximum time in game ticks between consecutive downward scaffold blocks. */
export const downwardScaffoldMaxTickGap = 10;
/** @type {number} Minimum horizontal speed (blocks/sec) player must maintain while downward scaffolding. */
export const downwardScaffoldMinHorizontalSpeed = 3.0;
export const enableAirPlaceCheck = false; // If true, the check for Placing Blocks onto Air/Liquid without support is active.
/** @type {string[]} List of block type IDs that are considered 'solid' and typically require support. */
export const airPlaceSolidBlocks = [
    "minecraft:cobblestone", "minecraft:stone", "minecraft:dirt", "minecraft:grass_block", "minecraft:oak_planks", "minecraft:spruce_planks",
    "minecraft:birch_planks", "minecraft:jungle_planks", "minecraft:acacia_planks", "minecraft:dark_oak_planks", "minecraft:crimson_planks",
    "minecraft:warped_planks", "minecraft:sand", "minecraft:gravel", "minecraft:obsidian", "minecraft:netherrack", "minecraft:end_stone"
];

// --- Fast Use/Place Checks ---
export const enableFastUseCheck = true; // If true, the Fast Item Use check is active.
/** @type {Object.<string, number>} Defines minimum cooldown in milliseconds between uses for specific items. */
export const fastUseItemCooldowns = {
    "minecraft:ender_pearl": 1000, "minecraft:snowball": 150, "minecraft:egg": 150, "minecraft:bow": 200,
    "minecraft:crossbow": 1250, "minecraft:potion": 800, "minecraft:splash_potion": 500,
    "minecraft:lingering_potion": 500, "minecraft:chorus_fruit": 800, "minecraft:shield": 500
};
export const enableFastPlaceCheck = false; // If true, the Fast Block Place check is active.
/** @type {number} Time window in milliseconds for fast block placement detection. */
export const fastPlaceTimeWindowMs = 1000;
/** @type {number} Maximum number of blocks allowed to be placed within `fastPlaceTimeWindowMs`. */
export const fastPlaceMaxBlocksInWindow = 10;

// --- Combat Log Detection ---
export const acGlobalNotificationsDefaultOn = true; // If true, admins receive AC notifications by default.

// --- Death Effects ---
export const enableDeathEffects = false; // If true, cosmetic effects are shown when a player dies.
/** @type {string} The particle effect name to spawn when a player dies. */
export const deathEffectParticleName = "minecraft:totem_particle";
/** @type {string} The sound ID to play when a player dies. */
export const deathEffectSoundId = "mob.ghast.scream";
/** @type {object} Defines the default cosmetic effect shown when a player dies (legacy). */
export const defaultDeathEffect = {
    soundId: "ambient.weather.lightning.impact", particleCommand: "particle minecraft:large_explosion ~ ~1 ~",
    soundOptions: { volume: 1.0, pitch: 0.8 }
};

// Anti-Grief Settings
/** @type {number} Radius for the density check cube (e.g., 1 means 3x3x3 cube). */
export const blockSpamDensityCheckRadius = 1;
/** @type {number} Time window in ticks to consider recent blocks for density calculation. */
export const blockSpamDensityTimeWindowTicks = 60;
/** @type {number} Percentage of volume filled by player's recent blocks to trigger detection. */
export const blockSpamDensityThresholdPercentage = 70;

// --- Client Behavior Checks ---
export const enableInvalidRenderDistanceCheck = true; // If true, the Invalid Render Distance check is active.
/** @type {number} Maximum allowed client-reported render distance in chunks. */
export const maxAllowedClientRenderDistance = 64;

// --- Chat Behavior Checks ---
export const enableChatDuringCombatCheck = true; // If true, the Chat During Combat check is active.
/** @type {number} Seconds after the last combat interaction during which a player cannot chat. */
export const chatDuringCombatCooldownSeconds = 4;
export const enableChatDuringItemUseCheck = true; // If true, the Chat During Item Use check is active.

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

// --- System ---
/** @type {string} The current version of the AntiCheat system. */
export const acVersion = "v__VERSION_STRING__";

/** @type {Object.<string, string>} Defines aliases for commands. */
export const commandAliases = {
    "v": "version", "w": "watch", "i": "inspect", "rf": "resetflags", "xn": "xraynotify", "mf": "myflags",
    "notifications": "notify", "ui": "panel", "cw": "clearwarnings"
};

/** @type {object} Holds the current, potentially runtime-modified, values of configurations. */
export let editableConfigValues = {
    commandSettings, serverRules, adminTag, ownerPlayerName, enableDebugLogging, prefix, enableWelcomerMessage, welcomeMessage,
    notifyAdminOnNewPlayerJoin, enableDeathCoordsMessage, deathCoordsMessage, enableCombatLogDetection, combatLogThresholdSeconds,
    combatLogFlagIncrement, combatLogMessage, enableTPASystem, TPARequestTimeoutSeconds, TPARequestCooldownSeconds,
    TPATeleportWarmupSeconds, discordLink, websiteLink, helpLinks, generalHelpMessages, enableDetailedJoinLeaveLogging,
    enableSwearCheck, swearWordList, swearCheckMuteDuration, enableAntiAdvertisingCheck, antiAdvertisingPatterns,
    antiAdvertisingActionProfileName, enableAdvancedLinkDetection, advancedLinkRegexList, advertisingWhitelistPatterns,
    enableCapsCheck, capsCheckMinLength, capsCheckUpperCasePercentage, capsCheckActionProfileName, enableCharRepeatCheck,
    charRepeatMinLength, charRepeatThreshold, charRepeatActionProfileName, enableSymbolSpamCheck, symbolSpamMinLength,
    symbolSpamPercentage, symbolSpamActionProfileName, enableTntAntiGrief, allowAdminTntPlacement, tntPlacementAction,
    enableWitherAntiGrief, allowAdminWitherSpawn, witherSpawnAction, enableFireAntiGrief, allowAdminFire, fireControlAction,
    enableLavaAntiGrief, allowAdminLava, lavaPlacementAction, enableWaterAntiGrief, allowAdminWater, waterPlacementAction,
    enableBlockSpamAntiGrief, blockSpamBypassInCreative, blockSpamTimeWindowMs, blockSpamMaxBlocksInWindow,
    blockSpamMonitoredBlockTypes, blockSpamAction, enableEntitySpamAntiGrief, entitySpamBypassInCreative,
    entitySpamTimeWindowMs, entitySpamMaxSpawnsInWindow, entitySpamMonitoredEntityTypes, entitySpamAction,
    enableBlockSpamDensityCheck, blockSpamDensityMonitoredBlockTypes, blockSpamDensityAction, enablePistonLagCheck,
    pistonActivationLogThresholdPerSecond, pistonActivationSustainedDurationSeconds, pistonLagLogCooldownSeconds,
    enableWorldBorderSystem, worldBorderWarningMessage, worldBorderDefaultEnableDamage, worldBorderDefaultDamageAmount,
    worldBorderDefaultDamageIntervalTicks, worldBorderTeleportAfterNumDamageEvents, worldBorderEnableVisuals,
    worldBorderParticleName, worldBorderVisualRange, worldBorderParticleDensity, worldBorderParticleWallHeight,
    worldBorderParticleSegmentLength, worldBorderVisualUpdateIntervalTicks, worldBorderParticleSequence,
    worldBorderEnablePulsingDensity, worldBorderPulseDensityMin, worldBorderPulseDensityMax, worldBorderPulseSpeed,
    xrayDetectionNotifyOnOreMineEnabled, xrayDetectionMonitoredOres, xrayDetectionAdminNotifyByDefault,
    enableAutoMod, enableReachCheck, enableCPSCheck, enableViewSnapCheck, enableMultiTargetCheck,
    enableStateConflictCheck, enableFlyCheck, enableSpeedCheck, enableNofallCheck, enableNukerCheck, enableIllegalItemCheck,
    enableSelfHurtCheck, enableNetherRoofCheck, enableAutoToolCheck, autoToolSwitchToOptimalWindowTicks,
    autoToolSwitchBackWindowTicks, enableInstaBreakUnbreakableCheck, instaBreakUnbreakableBlocks, enableInstaBreakSpeedCheck,
    instaBreakTimeToleranceTicks, enableNameSpoofCheck, nameSpoofMaxLength, nameSpoofDisallowedCharsRegex,
    nameSpoofMinChangeIntervalTicks, enableAntiGMCCheck, antiGMCSwitchToGameMode, antiGmcAutoSwitch, enableInventoryModCheck,
    enableNoSlowCheck, noSlowMaxSpeedEating, noSlowMaxSpeedChargingBow, noSlowMaxSpeedUsingShield, noSlowMaxSpeedSneaking,
    enableInvalidSprintCheck, sprintHungerLimit, noSlowSpeedEffectTolerancePercent, attackBlockingConsumables,
    attackBlockingBows, attackBlockingShields, itemUseStateClearTicks, maxVerticalSpeed, maxHorizontalSpeed, speedEffectBonus,
    minFallDistanceForDamage, flySustainedVerticalSpeedThreshold, flySustainedOffGroundTicksThreshold, flyHoverNearGroundThreshold,
    flyHoverVerticalSpeedThreshold, flyHoverOffGroundTicksThreshold, flyHoverMaxFallDistanceThreshold, speedToleranceBuffer,
    speedGroundConsecutiveTicksThreshold, noFallMitigationBlocks, netherRoofYLevelThreshold, maxCpsThreshold, reachDistanceSurvival,
    reachDistanceCreative, reachBuffer, cpsCalculationWindowMs, maxPitchSnapPerTick, maxYawSnapPerTick, viewSnapWindowTicks,
    invalidPitchThresholdMin, invalidPitchThresholdMax, multiTargetWindowMs, multiTargetThreshold, multiTargetMaxHistory,
    nukerMaxBreaksShortInterval, nukerCheckIntervalMs, enableNewlineCheck, flagOnNewline, cancelMessageOnNewline,
    enableMaxMessageLengthCheck, maxMessageLength, flagOnMaxMessageLength, cancelOnMaxMessageLength, spamRepeatCheckEnabled,
    spamRepeatMessageCount, spamRepeatTimeWindowSeconds, spamRepeatFlagPlayer, spamRepeatCancelMessage,
    enableFastMessageSpamCheck, fastMessageSpamThresholdMs, fastMessageSPAMActionProfileName, enableMaxWordsSpamCheck,
    maxWordsSpamThreshold, maxWordsSPAMActionProfileName, enableTowerCheck, towerMaxTickGap, towerMinHeight,
    towerMaxPitchWhilePillaring, towerPlacementHistoryLength, enableFlatRotationCheck, flatRotationConsecutiveBlocks,
    flatRotationMaxPitchVariance, flatRotationMaxYawVariance, flatRotationPitchHorizontalMin, flatRotationPitchHorizontalMax,
    flatRotationPitchDownwardMin, flatRotationPitchDownwardMax, enableDownwardScaffoldCheck, downwardScaffoldMinBlocks,
    downwardScaffoldMaxTickGap, downwardScaffoldMinHorizontalSpeed, enableAirPlaceCheck, airPlaceSolidBlocks,
    enableFastUseCheck, fastUseItemCooldowns, enableFastPlaceCheck, fastPlaceTimeWindowMs, fastPlaceMaxBlocksInWindow,
    acGlobalNotificationsDefaultOn, enableDeathEffects, deathEffectParticleName, deathEffectSoundId, defaultDeathEffect,
    blockSpamDensityCheckRadius, blockSpamDensityTimeWindowTicks, blockSpamDensityThresholdPercentage,
    maxAllowedClientRenderDistance, enableChatDuringCombatCheck, chatDuringCombatCooldownSeconds, enableChatDuringItemUseCheck,
    nameSpoofCheckIntervalTicks, antiGMCCheckIntervalTicks, netherRoofCheckIntervalTicks, autoToolCheckIntervalTicks,
    flatRotationCheckIntervalTicks, enableChatContentRepeatCheck, enableUnicodeAbuseCheck, enableGibberishCheck,
    gibberishMinMessageLength, gibberishMinAlphaRatio, gibberishVowelRatioLowerBound, gibberishVowelRatioUpperBound,
    gibberishMaxConsecutiveConsonants, gibberishActionProfileName, enableExcessiveMentionsCheck, mentionsMinMessageLength,
    mentionsMaxUniquePerMessage, mentionsMaxRepeatedPerMessage, mentionsActionProfileName, swearCheckActionProfileName
    // automodConfig and checkActionProfiles are complex objects and not suitable for direct editing via the current updateConfigValue.
    // They are imported and used directly. Runtime edits would require a more specialized mechanism.
    // automodConfig: importedAutoModConfig, // Removed
    // checkActionProfiles, // Removed
};

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
        const lowerNewValue = newValue.toLowerCase();
        if (lowerNewValue === 'true') coercedNewValue = true;
        else if (lowerNewValue === 'false') coercedNewValue = false;
        else { console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected boolean, got unparsable string "${newValue}". Update rejected.`); return false; }
    } else if (Array.isArray(oldValue) && typeof newValue === 'string') {
        const stringItems = newValue.trim() === "" ? [] : newValue.split(',').map(item => item.trim());
        if (oldValue.length > 0) {
            const targetElementType = typeof oldValue[0];
            const convertedArray = [];
            for (const item of stringItems) {
                let convertedItem;
                if (targetElementType === 'number') {
                    convertedItem = Number(item);
                    if (isNaN(convertedItem)) { console.warn(`[ConfigManager] Type mismatch for array element in key ${key}. Expected number, got "${item}". Update rejected.`); return false; }
                } else if (targetElementType === 'boolean') {
                    const lowerItem = item.toLowerCase();
                    if (lowerItem === 'true') convertedItem = true;
                    else if (lowerItem === 'false') convertedItem = false;
                    else { console.warn(`[ConfigManager] Type mismatch for array element in key ${key}. Expected boolean, got "${item}". Update rejected.`); return false; }
                } else {
                    convertedItem = item;
                }
                convertedArray.push(convertedItem);
            }
            coercedNewValue = convertedArray;
        } else {
            coercedNewValue = stringItems;
        }
    }

    const newCoercedType = typeof coercedNewValue;
    if (Array.isArray(oldValue)) {
        if (!Array.isArray(coercedNewValue)) { console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected array, received ${newCoercedType}. Update rejected.`); return false; }
        if (oldValue.length > 0 && coercedNewValue.length > 0) {
            const originalElementType = typeof oldValue[0];
            const newElementType = typeof coercedNewValue[0];
            if (originalElementType !== newElementType) { console.warn(`[ConfigManager] Element type mismatch for array key ${key}. Expected ${originalElementType}, got ${newElementType}. Update rejected.`); return false; }
        }
    } else if (originalType !== newCoercedType) {
        console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected ${originalType}, got ${newCoercedType}. Update rejected.`);
        return false;
    }

    if (JSON.stringify(oldValue) === JSON.stringify(coercedNewValue)) {
        if (enableDebugLogging) console.log(`[ConfigManager] No change for ${key}, value is already ${JSON.stringify(coercedNewValue)}`);
        return false;
    }
    editableConfigValues[key] = coercedNewValue;
    if (enableDebugLogging) console.log(`[ConfigManager] Updated ${key} from "${Array.isArray(oldValue) ? JSON.stringify(oldValue) : oldValue}" to "${Array.isArray(coercedNewValue) ? JSON.stringify(coercedNewValue) : coercedNewValue}"`);
    return true;
}
