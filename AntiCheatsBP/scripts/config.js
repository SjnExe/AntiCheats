/**
 * @file Anti-Cheat Configuration File
 * This file contains all configurable settings for the AntiCheat system.
 * It defines constants for various features, checks, and system behaviors.
 * It also includes a mechanism for runtime updates to certain configuration values.
 */

// Note: `checkActionProfiles` and `automodConfig` are complex objects imported from their respective modules.
// They are not part of `editableConfigValues` due to their complexity and are managed directly by their modules.
// import { checkActionProfiles } from './core/actionProfiles.js'; // Currently not used directly in this file after refactor
// import { automodConfig as importedAutoModConfig } from './core/automodConfig.js'; // Currently not used directly in this file

// --- General Admin & System ---
/** @type {string} The tag for identifying admin players. */
export const adminTag = 'admin';
/** @type {string} The exact name of the server owner. Required for owner-level commands/features. Case-sensitive. */
export const ownerPlayerName = 'PlayerNameHere'; // FIXME: User needs to change this
/** @type {boolean} If true, enables detailed debug logging to the console for development and troubleshooting. */
export const enableDebugLogging = true;
/** @type {string} The prefix for chat-based commands (e.g., "!", "."). */
export const prefix = '!';

// --- Welcomer & Player Info ---
/** @type {boolean} If true, a welcome message is sent to players when they join. */
export const enableWelcomerMessage = true;
/** @type {string} The welcome message. Placeholders: {playerName} */
export const welcomeMessage = 'Welcome, {playerName}, to our amazing server! We are glad to have you.';
/** @type {boolean} If true, admins are notified when a new player joins for the first time. */
export const notifyAdminOnNewPlayerJoin = true;
/** @type {boolean} If true, players are sent their death coordinates upon respawning. */
export const enableDeathCoordsMessage = true;
/** @type {string} The death coordinates message. Placeholders: {x}, {y}, {z}, {dimensionId} */
export const deathCoordsMessage = '§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.';

// --- Combat Log ---
/** @type {boolean} If true, enables detection of players leaving shortly after combat. */
export const enableCombatLogDetection = false;
/** @type {number} Seconds after last combat interaction within which leaving is considered combat logging. */
export const combatLogThresholdSeconds = 15;
/** @type {number} Number of flags to add for a combat log violation. */
export const combatLogFlagIncrement = 1;
/** @type {string} The admin notification message on combat log detection. Placeholders: {playerName}, {timeSinceCombat}, {incrementAmount} */
export const combatLogMessage = '§c[CombatLog] §e{playerName}§c disconnected {timeSinceCombat}s after being in combat! Flags: +{incrementAmount}';

// --- TPA System ---
/** @type {boolean} If true, the TPA (Teleport Ask) system is enabled. */
export const enableTpaSystem = false;
/** @type {number} Seconds a TPA request remains valid before automatically expiring. */
export const tpaRequestTimeoutSeconds = 60;
/** @type {number} Seconds a player must wait between sending TPA requests. */
export const tpaRequestCooldownSeconds = 10;
/** @type {number} Seconds of warmup before a player is teleported after a TPA request is accepted. Movement or damage cancels it. */
export const tpaTeleportWarmupSeconds = 10;

// --- Server Info & Links ---
/** @type {string} Link to the server's Discord. Displayed in help or server info commands. */
export const discordLink = 'https://discord.gg/example'; // FIXME: User needs to change this
/** @type {string} Link to the server's website. */
export const websiteLink = 'https://example.com'; // FIXME: User needs to change this
/** @type {Array<{title: string, url: string}>} Array of objects defining helpful links (e.g., for rules, reporting). */
export const helpLinks = [
    { title: 'Our Discord Server', url: 'https://discord.gg/YourInviteCode' }, // FIXME: User needs to change this
    { title: 'Website/Forums', url: 'https://yourwebsite.com/forums' }, // FIXME: User needs to change this
    { title: 'Report a Player', url: 'https://yourwebsite.com/report' }, // FIXME: User needs to change this
];
/** @type {string[]} Array of general help messages/tips. */
export const generalHelpMessages = [
    'Welcome to the server! Type !help for commands.',
    'Use !help for a list of commands.',
    'Report issues or players using !report.',
    'Type !rules to see the server rules.',
];

// --- Logging ---
/** @type {boolean} If true, enables detailed logging of player join and leave events to the console. */
export const enableDetailedJoinLeaveLogging = true;

// --- Chat Checks ---
/** @type {boolean} If true, enables the Swear Word detection check. */
export const enableSwearCheck = false;
/** @type {string[]} List of swear words to detect (case-insensitive, whole word). */
export const swearWordList = []; // Example: ['badword1', 'badword2']
/** @type {string} Duration for the mute applied on swear word detection (e.g., "30s", "5m", "1h"). Parsed by `playerUtils.parseDuration`. */
export const swearCheckMuteDuration = '30s';
/** @type {string} The action profile name from `actionProfiles.js` for swear word violations. */
export const swearCheckActionProfileName = 'chatSwearViolation';

/** @type {boolean} If true, enables the basic anti-advertising check in chat. */
export const enableAntiAdvertisingCheck = true;
/** @type {string[]} List of string patterns to detect potential advertisements. These are simple substring matches. */
export const antiAdvertisingPatterns = [
    'http://', 'https://', 'www.', '.com', '.net', '.org', '.gg', '.tk', '.co', '.uk', '.biz', '.info', '.io',
    '.me', '.tv', '.us', '.ws', '.club', '.store', '.online', '.site', '.xyz', '.shop',
    'discord.gg/', 'joinmc.', 'playmc.', 'server.',
];
/** @type {string} The action profile name from `actionProfiles.js` for advertising violations. */
export const antiAdvertisingActionProfileName = 'chatAdvertisingDetected';

/** @type {boolean} If true, enables advanced regex-based link detection and whitelisting. More comprehensive but potentially more resource-intensive. */
export const enableAdvancedLinkDetection = false;
/** @type {string[]} List of regex strings for advanced link detection. Ensure these are valid JavaScript regex patterns. */
export const advancedLinkRegexList = [
    'https?://(?:[a-zA-Z0-9\\-_]+\\.)+[a-zA-Z]{2,}(?::\\d+)?(?:/[^\\s]*)?',
    'www\\.(?:[a-zA-Z0-9\\-_]+\\.)+[a-zA-Z]{2,}(?::\\d+)?(?:/[^\\s]*)?',
    '\\b(?:[a-zA-Z0-9\\-_]+\\.)+(com|net|org|gg|io|me|tv|us|uk|biz|info|club|store|online|site|xyz|shop|network|info|website|co|dev|app|online|xyz|tech|space|store|fun|press|host|art|blog|cafe|pics|live|life|news|ninja|cool|guru|gallery|city|country|link|click|buzz|stream|tube|chat|community|forum|group|page|fans|media|show|studio|style|video|software|pictures|graphics|game|games|server|play|mc|srv|network|gaming|fun|pro|services|shop|store|center|solutions|support|tech|tools|systems|cloud|digital|data|security|hosting|design|dev|app|api)(\\b|/[^\\s]*)',
    '\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}(?::\\d+)?(?:/[^\\s]*)?\\b', // IP Address regex
];
/** @type {string[]} List of patterns (strings or regex strings) to whitelist from advertising flags. If using regex, ensure they are valid. */
export const advertisingWhitelistPatterns = []; // Example: ['myserver\\.com', 'discord\\.gg/myinvite']

/** @type {boolean} If true, enables the check for excessive capitalization (CAPS abuse) in chat. */
export const enableCapsCheck = true;
/** @type {number} The minimum message length for the CAPS abuse check to apply. */
export const capsCheckMinLength = 10;
/** @type {number} The percentage (0-100) of uppercase letters to trigger a CAPS abuse flag. */
export const capsCheckUpperCasePercentage = 70;
/** @type {string} The action profile name from `actionProfiles.js` for CAPS abuse violations. */
export const capsCheckActionProfileName = 'chatCapsAbuseDetected';

/** @type {boolean} If true, enables the check for excessive character repetition in chat (e.g., "helloooooo"). */
export const enableCharRepeatCheck = true;
/** @type {number} The minimum message length for the character repeat check to apply. */
export const charRepeatMinLength = 10;
/** @type {number} The minimum number of identical consecutive characters to trigger a flag. */
export const charRepeatThreshold = 6;
/** @type {string} The action profile name from `actionProfiles.js` for character repeat violations. */
export const charRepeatActionProfileName = 'chatCharRepeatDetected';

/** @type {boolean} If true, enables the check for excessive symbol usage in chat. */
export const enableSymbolSpamCheck = true;
/** @type {number} The minimum message length for the symbol spam check to apply. */
export const symbolSpamMinLength = 10;
/** @type {number} The percentage (0-100) of non-alphanumeric characters to trigger a symbol spam flag. */
export const symbolSpamPercentage = 50;
/** @type {string} The action profile name from `actionProfiles.js` for symbol spam violations. */
export const symbolSpamActionProfileName = 'chatSymbolSpamDetected';

// --- AntiGrief ---
// Note: For "Action" settings (e.g., tntPlacementAction), valid options usually include:
// "remove" (remove the offending item/block), "prevent" (cancel the action), "kill" (kill spawned entity),
// "warn" (warn the player), "flag_only" (only add a flag, no direct intervention).
// Check specific check implementation for exact supported actions.

// AntiGrief - TNT
/** @type {boolean} If true, enables anti-grief measures for TNT placement. */
export const enableTntAntiGrief = false;
/** @type {boolean} If true, admins (identified by `adminTag`) can place TNT without restriction. */
export const allowAdminTntPlacement = true;
/** @type {string} Action to take when unauthorized TNT placement is detected ("remove", "warn", "flag_only"). */
export const tntPlacementAction = 'remove';

// AntiGrief - Wither
/** @type {boolean} If true, enables anti-grief measures for Wither spawning. */
export const enableWitherAntiGrief = false;
/** @type {boolean} If true, admins can spawn Withers without restriction. */
export const allowAdminWitherSpawn = true;
/** @type {string} Action for unauthorized Wither spawn ("prevent", "kill", "warn", "flag_only"). */
export const witherSpawnAction = 'prevent';

// AntiGrief - Fire
/** @type {boolean} If true, enables anti-grief measures for fire spread/placement. */
export const enableFireAntiGrief = false;
/** @type {boolean} If true, admins can create fire without restriction. */
export const allowAdminFire = true;
/** @type {string} Action for unauthorized fire ("extinguish", "warn", "flag_only"). */
export const fireControlAction = 'extinguish';

// AntiGrief - Lava
/** @type {boolean} If true, enables anti-grief measures for lava placement. */
export const enableLavaAntiGrief = false;
/** @type {boolean} If true, admins can place lava without restriction. */
export const allowAdminLava = true;
/** @type {string} Action for unauthorized lava placement ("remove", "warn", "flag_only"). */
export const lavaPlacementAction = 'remove';

// AntiGrief - Water
/** @type {boolean} If true, enables anti-grief measures for water placement. */
export const enableWaterAntiGrief = false;
/** @type {boolean} If true, admins can place water without restriction. */
export const allowAdminWater = true;
/** @type {string} Action for unauthorized water placement ("remove", "warn", "flag_only"). */
export const waterPlacementAction = 'remove';

// AntiGrief - Block Spam (Rate-based)
/** @type {boolean} If true, enables detection of rapid block placement (block spam by rate). */
export const enableBlockSpamAntiGrief = false;
/** @type {boolean} If true, players in Creative mode bypass the block spam (rate) check. */
export const blockSpamBypassInCreative = true;
/** @type {number} Time window in milliseconds to count blocks for rate-based spam detection. */
export const blockSpamTimeWindowMs = 1000; // 1 second
/** @type {number} Maximum number of blocks allowed to be placed within `blockSpamTimeWindowMs`. */
export const blockSpamMaxBlocksInWindow = 8;
/** @type {string[]} Specific block types to monitor for rate-based spam. Empty array means all blocks. Example: ["minecraft:dirt", "minecraft:cobblestone"] */
export const blockSpamMonitoredBlockTypes = ['minecraft:dirt', 'minecraft:cobblestone', 'minecraft:netherrack', 'minecraft:sand', 'minecraft:gravel'];
/** @type {string} Action for block spam (rate) violation ("warn", "flag_only", "kick"). */
export const blockSpamAction = 'warn';

// AntiGrief - Entity Spam
/** @type {boolean} If true, enables detection of rapid entity spawning (e.g., boats, armor stands). */
export const enableEntitySpamAntiGrief = false;
/** @type {boolean} If true, players in Creative mode bypass the entity spam check. */
export const entitySpamBypassInCreative = true;
/** @type {number} Time window in milliseconds to count entities for spam detection. */
export const entitySpamTimeWindowMs = 2000; // 2 seconds
/** @type {number} Maximum number of specified entities allowed to be spawned within `entitySpamTimeWindowMs`. */
export const entitySpamMaxSpawnsInWindow = 5;
/** @type {string[]} Specific entity types to monitor for spam. Example: ["minecraft:boat", "minecraft:armor_stand"] */
export const entitySpamMonitoredEntityTypes = ['minecraft:boat', 'minecraft:armor_stand', 'minecraft:item_frame', 'minecraft:minecart', 'minecraft:snow_golem', 'minecraft:iron_golem'];
/** @type {string} Action for entity spam violation ("kill", "warn", "flag_only"). "kill" attempts to remove the spawned entities. */
export const entitySpamAction = 'kill';

// AntiGrief - Block Spam (Density-based)
/** @type {boolean} If true, enables detection of high-density block placement within a small area. */
export const enableBlockSpamDensityCheck = false;
/** @type {string[]} Specific block types to monitor for density-based spam. Empty array means all blocks. */
export const blockSpamDensityMonitoredBlockTypes = ['minecraft:dirt', 'minecraft:cobblestone', 'minecraft:netherrack', 'minecraft:sand', 'minecraft:gravel'];
/** @type {string} Action for block spam (density) violation ("warn", "flag_only"). */
export const blockSpamDensityAction = 'warn';
/** @type {number} Radius for the density check cube (e.g., 1 means a 3x3x3 cube centered on the new block). */
export const blockSpamDensityCheckRadius = 1;
/** @type {number} Time window in game ticks to consider recent blocks for density calculation. (e.g., 60 ticks = 3 seconds). */
export const blockSpamDensityTimeWindowTicks = 60;
/** @type {number} Percentage (0-100) of volume filled by player's recent blocks within the check radius to trigger detection. */
export const blockSpamDensityThresholdPercentage = 70;


// --- Piston Lag Check ---
/** @type {boolean} If true, enables monitoring of rapid piston activations to detect potential lag machines. */
export const enablePistonLagCheck = false;
/** @type {number} Activations per second of a single piston to trigger logging/alert. */
export const pistonActivationLogThresholdPerSecond = 15;
/** @type {number} Duration in seconds piston activity must be sustained above threshold to trigger. */
export const pistonActivationSustainedDurationSeconds = 3;
/** @type {number} Cooldown in seconds before logging/alerting for the same piston again to prevent log spam. */
export const pistonLagLogCooldownSeconds = 60;

// --- World Border System ---
/** @type {boolean} Master switch for the entire World Border feature. */
export const enableWorldBorderSystem = false;
/** @type {string} Warning message shown to players approaching the border. */
export const worldBorderWarningMessage = '§cYou are approaching the world border!';
/** @type {boolean} Default setting for whether players take damage when outside the world border. */
export const worldBorderDefaultEnableDamage = false;
/** @type {number} Default damage amount per interval for players outside the border (0.5 heart = 1 damage). */
export const worldBorderDefaultDamageAmount = 0.5;
/** @type {number} Default interval in game ticks at which damage is applied (20 ticks = 1 second). */
export const worldBorderDefaultDamageIntervalTicks = 20;
/** @type {number} Number of damage events after which a player is teleported back inside. Set to 0 or negative to disable teleport. */
export const worldBorderTeleportAfterNumDamageEvents = 30;

// World Border Visuals
/** @type {boolean} If true, enables visual particle effects for the world border. Can be performance intensive. */
export const worldBorderEnableVisuals = false;
/** @type {string} Default particle type ID for the world border visual effect (e.g., "minecraft:end_rod", "minecraft:basic_crit_particle"). */
export const worldBorderParticleName = 'minecraft:end_rod';
/** @type {number} Visual range in blocks from the border where particles may appear. */
export const worldBorderVisualRange = 24;
/** @type {number} Density of particles for the visual effect. Higher is denser. Affects performance. */
export const worldBorderParticleDensity = 1;
/** @type {number} Height in blocks of the particle wall visual. */
export const worldBorderParticleWallHeight = 4;
/** @type {number} Length in blocks of each segment of the particle wall. Larger segments might perform better but look less continuous. */
export const worldBorderParticleSegmentLength = 32;
/** @type {number} Interval in game ticks at which world border visuals are updated. Higher interval = less frequent updates, better performance. */
export const worldBorderVisualUpdateIntervalTicks = 10; // 0.5 seconds
/** @type {string[]} If populated, visuals cycle through these particles. Overrides `worldBorderParticleName`. Example: ["minecraft:totem_particle", "minecraft:end_rod"] */
export const worldBorderParticleSequence = [];
/** @type {boolean} If true, enables pulsing density effect for border visuals. Adds to visual flair but also performance cost. */
export const worldBorderEnablePulsingDensity = false;
/** @type {number} Minimum particle density multiplier for pulsing effect (0.0 to 1.0). */
export const worldBorderPulseDensityMin = 0.5;
/** @type {number} Maximum particle density multiplier for pulsing effect (>= `worldBorderPulseDensityMin`). */
export const worldBorderPulseDensityMax = 1.5;
/** @type {number} Speed of the pulsing effect. Higher is faster. */
export const worldBorderPulseSpeed = 1.0;

// --- X-Ray Detection Notifications ---
/** @type {boolean} If true, admins are notified when players mine valuable ores. This is a notification system, not a preventative measure. */
export const xrayDetectionNotifyOnOreMineEnabled = true;
/** @type {string[]} List of block type IDs monitored for X-Ray mining notifications. */
export const xrayDetectionMonitoredOres = ['minecraft:diamond_ore', 'minecraft:deepslate_diamond_ore', 'minecraft:ancient_debris'];
/** @type {boolean} If true, admins receive X-Ray notifications by default (can be toggled per admin using !xraynotify). */
export const xrayDetectionAdminNotifyByDefault = true;

// --- Chat Formatting ---
// Chat formatting (prefixes, suffixes, colors) is now primarily handled by `ranksConfig.js` and `rankManager.js`.

// --- Command Specific Toggles ---
// Enables or disables specific commands. Does not override permission checks.
export const commandSettings = {
    version: { enabled: true },
    myflags: { enabled: true },
    testnotify: { enabled: true },
    kick: { enabled: true },
    clearchat: { enabled: true },
    inspect: { enabled: true },
    warnings: { enabled: true }, // Alias for inspect or similar functionality
    resetflags: { enabled: true },
    rules: { enabled: true },
    vanish: { enabled: false }, // Vanish command often needs server-side gamemode/packet manipulation not fully available
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
    notify: { enabled: true }, // For toggling general AC notifications
    xraynotify: { enabled: true }, // For toggling X-Ray notifications
    tpa: { enabled: true }, // Depends on enableTPASystem
    tpaccept: { enabled: true }, // Depends on enableTPASystem
    tpacancel: { enabled: true }, // Depends on enableTPASystem
    tpahere: { enabled: true }, // Depends on enableTPASystem
    tpastatus: { enabled: true }, // Depends on enableTPASystem
    tp: { enabled: true },
    copyinv: { enabled: true },
    uinfo: { enabled: true }, // User info command
    netherlock: { enabled: false }, // Dimension lock commands might be complex
    endlock: { enabled: false },
    worldborder: { enabled: true }, // Depends on enableWorldBorderSystem
    setlang: { enabled: false }, // Multi-language support removed
    addrank: { enabled: true }, // Depends on rank system
    removerank: { enabled: true }, // Depends on rank system
    listranks: { enabled: true }, // Depends on rank system
    listwatched: { enabled: true },
    purgeflags: { enabled: true }, // For admins to clear all flags of a player
    report: { enabled: true },
    viewreports: { enabled: true },
    clearreports: { enabled: true },
    watch: { enabled: true },
    unwatch: { enabled: true },
    // Add new commands here with their default enabled state
};

// --- Automated Moderation System ---
/** @type {boolean} If true, the Automated Moderation system (AutoMod) is active. This system uses `automodConfig.js` and `actionProfiles.js`. */
export const enableAutoMod = false;

// --- Server Rules ---
/** @type {string} A single string containing all server rules, separated by newlines. Displayed by the `!rules` command. */
export const serverRules = `Rule 1: Be respectful to all players and staff.
Rule 2: No cheating, exploiting, or using unauthorized modifications.
Rule 3: Do not spam chat or use excessive caps/symbols.
Rule 4: Follow instructions from server administrators and moderators.
Rule 5: Keep chat appropriate and avoid offensive language.
Rule 6: Have fun and contribute to a positive community!`; // FIXME: User should customize rules

// --- General Check Toggles (Master Switches for Check Categories) ---
// These enable/disable entire categories or specific complex checks.
// Individual sub-checks might have their own toggles or conditions within their modules.
export const enableReachCheck = true;
export const enableCpsCheck = true;
export const enableViewSnapCheck = true; // Covers aimbot-like fast view changes (pitch/yaw)
export const enableMultiTargetCheck = true; // Killaura hitting multiple targets quickly
export const enableStateConflictCheck = true; // Killaura attacking while eating, shielding, etc.
export const enableFlyCheck = false; // Movement: Fly
export const enableSpeedCheck = false; // Movement: Speed
export const enableNofallCheck = true; // Movement: NoFall
export const enableNukerCheck = false; // World: Nuker (breaking blocks too fast/wide area)
export const enableIllegalItemCheck = true; // World: Interacting with banned items
export const enableSelfHurtCheck = true; // Player: Self-inflicted damage (e.g., to bypass combat timers)
export const enableNetherRoofCheck = false; // Movement: Exploiting Nether roof

// --- Movement Checks Specifics ---
/** @type {number} The Y-level at or above which a player in the Nether is considered to be on the roof. */
export const netherRoofYLevelThreshold = 128;
/** @type {number} Maximum vertical speed (positive for upward, negative for downward) in blocks per second. Used by Fly check. Vanilla jump is ~4.2 BPS, Elytra can be much higher. */
export const maxVerticalSpeed = 10; // Adjust based on server mechanics (e.g., jump boost items)
/** @type {number} Maximum horizontal speed in blocks per second. Default vanilla sprint speed is ~5.6 BPS. */
export const maxHorizontalSpeed = 7.8; // Approx Speed II (5.6 * 1.4), adjust for server items/effects
/** @type {number} Flat bonus to maximum horizontal speed (blocks/sec) added per level of the Speed effect. Vanilla Speed I = +20%, Speed II = +40%. A flat bonus can simplify this. */
export const speedEffectBonus = 1.12; // (5.6 * 0.20) per level, approx
/** @type {number} Minimum fall distance in blocks that is expected to cause fall damage. Used by NoFall check. Vanilla is >3 blocks. */
export const minFallDistanceForDamage = 3.5;
/** @type {number} Threshold for vertical speed (blocks per tick, positive is upward) for sustained fly detection. (0.5 BPT = 10 BPS) */
export const flySustainedVerticalSpeedThreshold = 0.5;
/** @type {number} Number of consecutive off-ground ticks, while exceeding `flySustainedVerticalSpeedThreshold`, to trigger a fly flag. */
export const flySustainedOffGroundTicksThreshold = 10; // 0.5 seconds
/** @type {number} Minimum height in blocks above the last known ground position for hover detection. */
export const flyHoverNearGroundThreshold = 3;
/** @type {number} Vertical speed (absolute value, blocks per tick) below which a player is considered hovering. (0.08 BPT = 1.6 BPS) */
export const flyHoverVerticalSpeedThreshold = 0.08;
/** @type {number} Number of consecutive off-ground ticks, while meeting hover conditions, to trigger a hover flag. */
export const flyHoverOffGroundTicksThreshold = 20; // 1 second
/** @type {number} Maximum fall distance accumulated while hovering that will not be reset, to differentiate from actual falls. */
export const flyHoverMaxFallDistanceThreshold = 1.0;
/** @type {number} A tolerance buffer in blocks per second added to the maximum horizontal speed calculation to reduce false positives. */
export const speedToleranceBuffer = 0.5;
/** @type {number} Number of consecutive ticks a player must exceed maximum horizontal speed on ground to be flagged by Speed check. */
export const speedGroundConsecutiveTicksThreshold = 5; // 0.25 seconds
/** @type {string[]} List of block type IDs that mitigate fall damage (e.g., "minecraft:hay_block", "minecraft:water"). Water is handled by checking `isInWater` or `isTouchingWater`. */
export const noFallMitigationBlocks = ['minecraft:hay_block', 'minecraft:powder_snow', 'minecraft:sweet_berry_bush', 'minecraft:cobweb']; // Added cobweb

/** @type {boolean} If true, the NoSlow check (detecting movement speed reduction bypass while using items/sneaking) is active. */
export const enableNoSlowCheck = false;
/** @type {number} Percentage (0.0 to 1.0) of additional speed allowed if player has Speed effect, relative to the action's max speed. E.g., 0.10 for 10% buffer. */
export const noSlowSpeedEffectTolerancePercent = 0.10;
/** @type {number} Maximum horizontal speed (blocks/sec) allowed while eating or drinking. Vanilla movement is significantly slowed. */
export const noSlowMaxSpeedEating = 1.0;
/** @type {number} Maximum horizontal speed (blocks/sec) allowed while charging a bow. Vanilla movement is significantly slowed. */
export const noSlowMaxSpeedChargingBow = 1.0;
/** @type {number} Maximum horizontal speed (blocks/sec) allowed while actively using/raising a shield. Vanilla walking speed is ~4.3 BPS; shield does not slow normal walking/sprinting. This value helps catch hacks if combined with other speed modifiers. */
export const noSlowMaxSpeedUsingShield = 4.4; // Slightly above normal walk speed
/** @type {number} Maximum horizontal speed (blocks/sec) allowed while sneaking. Vanilla sneaking speed is ~1.31 BPS. */
export const noSlowMaxSpeedSneaking = 1.5;

/** @type {boolean} If true, the Invalid Sprint check (detecting sprinting under disallowed conditions like hunger, blindness, using item) is active. */
export const enableInvalidSprintCheck = true;
/** @type {number} Minimum food level (inclusive) required to sprint. Vanilla default is > 6 (i.e., 7 or more). */
export const sprintHungerLimit = 6; // Food level must be > this (e.g., 7+)

// --- Combat Checks Specifics ---
/** @type {number} Maximum clicks per second (CPS) threshold before flagging. Humanly achievable sustainable CPS is typically below 15-20. */
export const maxCpsThreshold = 20;
/** @type {number} Maximum reach distance in blocks for Survival/Adventure mode players. Vanilla is ~3 for melee, ~4.5 for block interaction. */
export const reachDistanceSurvival = 4.5; // Max interaction reach
/** @type {number} Maximum reach distance in blocks for Creative mode players. Vanilla is ~5 for melee, ~6 for block interaction. */
export const reachDistanceCreative = 6.0; // Max interaction reach
/** @type {number} A small buffer in blocks added to maximum reach distance calculations to reduce false positives from latency/minor inaccuracies. */
export const reachBuffer = 0.5;
/** @type {number} Time window in milliseconds over which CPS is calculated. */
export const cpsCalculationWindowMs = 1000; // 1 second

// --- View Snap / Invalid Pitch (Aimbot/Killaura components) ---
/** @type {number} Maximum degrees the player's pitch (up/down view angle) can change in a single game tick immediately after an attack. Very high values can indicate aim assistance. */
export const maxPitchSnapPerTick = 75;
/** @type {number} Maximum degrees the player's yaw (left/right view angle) can change in a single game tick immediately after an attack. */
export const maxYawSnapPerTick = 100;
/** @type {number} Number of game ticks after an attack during which view snaps (pitch/yaw changes) are monitored. */
export const viewSnapWindowTicks = 10; // 0.5 seconds
/** @type {number} Minimum pitch value (degrees) considered invalid (e.g., looking impossibly far down). Vanilla range is -90 to 90. */
export const invalidPitchThresholdMin = -90.5;
/** @type {number} Maximum pitch value (degrees) considered invalid (e.g., looking impossibly far up). Vanilla range is -90 to 90. */
export const invalidPitchThresholdMax = 90.5;

// --- Multi-Target Killaura ---
/** @type {number} Time window in milliseconds for detecting attacks on multiple distinct targets. */
export const multiTargetWindowMs = 1000; // 1 second
/** @type {number} Number of distinct entities that must be hit within the `multiTargetWindowMs` to trigger a multi-target flag. */
export const multiTargetThreshold = 3;
/** @type {number} Maximum number of recent hit target records to store per player for multi-target analysis. */
export const multiTargetMaxHistory = 10;

// --- State Conflict Checks (Killaura components - attacking while doing other actions) ---
/** @type {string[]} Item type IDs for consumables (food, potions) that should prevent attacking (melee/ranged) while being actively used. */
export const attackBlockingConsumables = [
    'minecraft:apple', 'minecraft:golden_apple', 'minecraft:enchanted_golden_apple', 'minecraft:mushroom_stew', 'minecraft:rabbit_stew',
    'minecraft:beetroot_soup', 'minecraft:suspicious_stew', 'minecraft:cooked_beef', 'minecraft:cooked_porkchop', 'minecraft:cooked_mutton',
    'minecraft:cooked_chicken', 'minecraft:cooked_rabbit', 'minecraft:cooked_salmon', 'minecraft:cooked_cod', 'minecraft:baked_potato',
    'minecraft:bread', 'minecraft:melon_slice', 'minecraft:carrot', 'minecraft:potato', 'minecraft:beetroot', 'minecraft:dried_kelp',
    'minecraft:potion', 'minecraft:honey_bottle', 'minecraft:chorus_fruit',
];
/** @type {string[]} Item type IDs for bows that should prevent melee attacking while being charged. (Firing the bow itself is allowed). */
export const attackBlockingBows = ['minecraft:bow', 'minecraft:crossbow'];
/** @type {string[]} Item type IDs for shields that should prevent attacking while being actively used (raised). */
export const attackBlockingShields = ['minecraft:shield'];
/** @type {number} Number of ticks an 'item use' state (e.g., `isUsingConsumable`) persists before auto-clearing if no explicit stop event. (20 ticks = 1 second). */
export const itemUseStateClearTicks = 60; // 3 seconds

// --- World Interaction Checks Specifics ---
// AutoTool Check
/** @type {boolean} If true, the AutoTool check (detecting instant switching to the optimal tool before breaking a block) is active. */
export const enableAutoToolCheck = false;
/** @type {number} Maximum ticks between starting to break a block and switching to an optimal tool to be considered suspicious by AutoTool check. Low values (e.g., 1-2) are stricter. */
export const autoToolSwitchToOptimalWindowTicks = 2;
/** @type {number} Maximum ticks after breaking a block (with a switched optimal tool) to detect a switch back to a previous non-optimal tool, for AutoTool check. */
export const autoToolSwitchBackWindowTicks = 5;

// InstaBreak Check
/** @type {boolean} If true, the check for breaking normally unbreakable blocks (like bedrock by non-ops) is active. */
export const enableInstaBreakUnbreakableCheck = false;
/** @type {string[]} List of block type IDs considered normally unbreakable by non-Operator players in Survival/Adventure. */
export const instaBreakUnbreakableBlocks = [
    'minecraft:bedrock', 'minecraft:barrier', 'minecraft:command_block', 'minecraft:repeating_command_block',
    'minecraft:chain_command_block', 'minecraft:structure_block', 'minecraft:structure_void', 'minecraft:jigsaw',
    'minecraft:light_block', 'minecraft:end_portal_frame', 'minecraft:end_gateway',
];
/** @type {boolean} If true, the check for breaking blocks significantly faster than vanilla capabilities (considering tool, enchantments, effects) is active. */
export const enableInstaBreakSpeedCheck = true;
/** @type {number} Tolerance in game ticks for block breaking speed. Actual break time must be less than (ExpectedTime - Tolerance) to flag. Higher values are more lenient. */
export const instaBreakTimeToleranceTicks = 2; // Be cautious with low values, server tick variation can affect this.

// Nuker Check (related to enableNukerCheck)
/** @type {number} Maximum number of blocks that can be broken within `nukerCheckIntervalMs` before flagging for Nuker. */
export const nukerMaxBreaksShortInterval = 4;
/** @type {number} Time window in milliseconds for the Nuker check to count broken blocks. */
export const nukerCheckIntervalMs = 200; // 0.2 seconds, very fast

// Illegal Item Check (related to enableIllegalItemCheck)
/** @type {string[]} Array of item type IDs banned from being placed by players. */
export const bannedItemsPlace = ['minecraft:command_block', 'minecraft:moving_block', 'minecraft:structure_void', 'minecraft:barrier'];
/** @type {string[]} Array of item type IDs banned from being used by players (e.g., right-click action). */
export const bannedItemsUse = []; // Example: Potentially harmful spawn eggs if not controlled by other means

// --- Player Behavior Checks Specifics ---
// NameSpoof Check
/** @type {boolean} If true, the NameSpoof check (detecting invalid characters, excessive length, or rapid name changes) is active. */
export const enableNameSpoofCheck = true;
/** @type {number} Maximum allowed length for a player's nameTag. Used by NameSpoof check. Vanilla limits are usually shorter. */
export const nameSpoofMaxLength = 48; // Check current Minecraft limits if being very strict.
/** @type {string} Regular expression pattern for disallowed characters in player nameTags (e.g., newlines, control characters). */
export const nameSpoofDisallowedCharsRegex = '[\\n\\r\\t\\x00-\\x1F\\x7F-\\x9F]'; // Common control characters
/** @type {number} Minimum interval in game ticks between allowed player nameTag changes. Used by NameSpoof check. (200 ticks = 10 seconds) */
export const nameSpoofMinChangeIntervalTicks = 200;

// Anti-Gamemode Creative (Anti-GMC) Check
/** @type {boolean} If true, the Anti-GMC check (detecting unauthorized Creative mode) is active. */
export const enableAntiGmcCheck = true;
/** @type {string} The gamemode (e.g., "survival", "adventure") to switch players to if unauthorized Creative mode is detected and `antiGmcAutoSwitch` is true. */
export const antiGmcSwitchToGameMode = 'survival';
/** @type {boolean} If true, automatically switch a player's gamemode if unauthorized Creative mode is detected. */
export const antiGmcAutoSwitch = true;

// Inventory Modification Check
/** @type {boolean} If true, Inventory Modification checks (e.g., for illegal items, unobtainable enchantments) are active. This is a complex area. */
export const enableInventoryModCheck = false; // Requires careful implementation to avoid false positives with custom items/plugins.

// --- Advanced Chat Checks Specifics ---
// Fast Message Spam Check
/** @type {boolean} If true, the Fast Message Spam check (sending messages too quickly) is active. */
export const enableFastMessageSpamCheck = true;
/** @type {number} Minimum time in milliseconds that must pass between messages to avoid being considered spam. */
export const fastMessageSpamThresholdMs = 500; // 0.5 seconds
/** @type {string} Action profile name for fast message spam. */
export const fastMessageSpamActionProfileName = 'chatSpamFastMessage';

// Max Words Spam Check
/** @type {boolean} If true, the Max Words Spam check (messages with too many words) is active. */
export const enableMaxWordsSpamCheck = true;
/** @type {number} Maximum allowed number of words in a single chat message. */
export const maxWordsSpamThreshold = 50;
/** @type {string} Action profile name for max words spam. */
export const maxWordsSpamActionProfileName = 'chatSpamMaxWords';

// Newline Character Check
/** @type {boolean} If true, checks for newline characters (\n, \r) in chat messages. */
export const enableNewlineCheck = true;
/** @type {boolean} If true, flags player for using newlines if `enableNewlineCheck` is true. */
export const flagOnNewline = true;
/** @type {boolean} If true, cancels messages with newlines if `enableNewlineCheck` is true. */
export const cancelMessageOnNewline = true;

// Max Message Length Check
/** @type {boolean} If true, checks if chat messages exceed `maxMessageLength`. */
export const enableMaxMessageLengthCheck = true;
/** @type {number} Maximum allowed character length for a single chat message. Vanilla limit is 256. */
export const maxMessageLength = 256;
/** @type {boolean} If true, flags player for overly long messages if `enableMaxMessageLengthCheck` is true. */
export const flagOnMaxMessageLength = true;
/** @type {boolean} If true, cancels overly long messages if `enableMaxMessageLengthCheck` is true. */
export const cancelOnMaxMessageLength = true;

// Repeated Message (Content) Spam Check
/** @type {boolean} If true, checks for players sending the same or very similar messages repeatedly. */
export const enableChatContentRepeatCheck = true;
/** @type {number} Number of identical/similar messages within `chatContentRepeatTimeWindowSeconds` to trigger a flag. */
export const chatContentRepeatMessageCount = 3;
/** @type {number} Time window in seconds to monitor for repeated/similar messages. */
export const chatContentRepeatTimeWindowSeconds = 5;
/** @type {boolean} If true, flags the player for content repeat spam. */
export const chatContentRepeatFlagPlayer = false;
/** @type {boolean} If true, cancels the message that triggers content repeat spam. */
export const chatContentRepeatCancelMessage = false;
/** @type {string} Action profile name for chat content repeat violations. */
export const chatContentRepeatActionProfileName = 'chatSpamContentRepeat';

// Unicode Abuse (Zalgo/Excessive Diacritics) Check
/** @type {boolean} If true, the Unicode Abuse (Zalgo text, excessive diacritics) check is active. */
export const enableUnicodeAbuseCheck = false; // Can be complex to implement reliably.
/** @type {string} Action profile name for Unicode abuse violations. */
export const unicodeAbuseActionProfileName = 'chatUnicodeAbuse';

// Gibberish Chat Check
/** @type {boolean} If true, the Gibberish Chat check (messages that appear to be random characters) is active. */
export const enableGibberishCheck = false;
/** @type {number} Minimum message length to apply gibberish check. */
export const gibberishMinMessageLength = 10;
/** @type {number} Minimum ratio of alphabetic characters (0.0-1.0) for gibberish check to apply (filters out symbol-only spam if covered by another check). */
export const gibberishMinAlphaRatio = 0.6;
/** @type {number} Lower bound for vowel ratio (0.0-1.0) to flag as gibberish (too few vowels). */
export const gibberishVowelRatioLowerBound = 0.15;
/** @type {number} Upper bound for vowel ratio (0.0-1.0) to flag as gibberish (too many vowels). */
export const gibberishVowelRatioUpperBound = 0.80;
/** @type {number} Maximum number of consecutive consonants to flag as gibberish. */
export const gibberishMaxConsecutiveConsonants = 5;
/** @type {string} Action profile name for gibberish violations. */
export const gibberishActionProfileName = 'chatGibberish';

// Excessive Mentions Check
/** @type {boolean} If true, the Excessive Mentions chat check (spamming @player tags) is active. */
export const enableExcessiveMentionsCheck = false;
/** @type {number} Minimum message length to apply excessive mentions check. */
export const mentionsMinMessageLength = 10;
/** @type {number} Maximum number of unique users that can be mentioned in a single message. */
export const mentionsMaxUniquePerMessage = 4;
/** @type {number} Maximum number of times a single user can be mentioned in a single message. */
export const mentionsMaxRepeatedPerMessage = 3;
/** @type {string} Action profile name for excessive mention violations. */
export const mentionsActionProfileName = 'chatExcessiveMentions';

// Simple Impersonation Check
/** @type {boolean} If true, the Simple Impersonation check (trying to look like server/staff messages) is active. */
export const enableSimpleImpersonationCheck = false;
/** @type {string[]} Regex patterns to identify server/staff message impersonation attempts. Use with caution to avoid false positives. */
export const impersonationServerMessagePatterns = [
    '^\\[(Server|Admin|System|Mod|Staff|Broadcast|Announcement|Alert)\\]', // Starts with [Server] etc.
    '^§[4c][\\s\\S]*?(Warning|Critical|Error)', // Starts with red/dark_red and contains keywords
    '^§[b9ea][\\s\\S]*?(Notice|Info|Server|System)', // Starts with aqua/blue/yellow/green and contains keywords
];
/** @type {number} Permission level (from rankManager) at or below which players are exempt from impersonation checks. E.g., 0 for normal players, higher for staff. */
export const impersonationExemptPermissionLevel = 1; // Staff (level 1+) might be exempt
/** @type {number} Minimum message length for impersonation pattern matching to apply. */
export const impersonationMinMessageLengthForPatternMatch = 10;
/** @type {string} Action profile name for impersonation attempts. */
export const impersonationActionProfileName = 'chatImpersonationAttempt';


// --- Scaffold/Tower/Building Checks Specifics ---
// Tower Check (Pillaring up quickly)
/** @type {boolean} If true, the Scaffold/Tower check (detecting players rapidly building straight up) is active. */
export const enableTowerCheck = false;
/** @type {number} Maximum time in game ticks between consecutive upward pillar blocks. Low values are stricter. */
export const towerMaxTickGap = 10; // 0.5 seconds
/** @type {number} Minimum number of consecutive upward blocks placed to trigger a tower flag. */
export const towerMinHeight = 5;
/** @type {number} Maximum pitch deviation (degrees, usually negative for looking down) allowed while pillaring up. Very specific pitch can indicate automation. */
export const towerMaxPitchWhilePillaring = -30; // Example: Must be looking down significantly
/** @type {number} How many recent block placements to store for pattern analysis related to building checks. */
export const towerPlacementHistoryLength = 20;

// Flat/Invalid Rotation While Building Check
/** @type {boolean} If true, the Flat/Invalid Rotation While Building check (detecting building with unnatural, static view angles) is active. */
export const enableFlatRotationCheck = false;
/** @type {number} Number of consecutive block placements to analyze for static or flat rotation patterns. */
export const flatRotationConsecutiveBlocks = 4;
/** @type {number} Maximum degrees of variance allowed for pitch over `flatRotationConsecutiveBlocks` to be considered 'static'. */
export const flatRotationMaxPitchVariance = 2.0;
/** @type {number} Maximum degrees of variance allowed for yaw over `flatRotationConsecutiveBlocks` to be considered 'static'. */
export const flatRotationMaxYawVariance = 2.0;
/** @type {number} Minimum pitch for 'flat horizontal' building detection (e.g., bridging straight out). */
export const flatRotationPitchHorizontalMin = -5.0;
/** @type {number} Maximum pitch for 'flat horizontal' building detection. */
export const flatRotationPitchHorizontalMax = 5.0;
/** @type {number} Minimum pitch for 'flat downward' building detection (e.g., scaffolding straight down with minimal view change). */
export const flatRotationPitchDownwardMin = -90.0; // Looking straight down
/** @type {number} Maximum pitch for 'flat downward' building detection. */
export const flatRotationPitchDownwardMax = -85.0; // Slightly up from straight down

// Downward Scaffold Check
/** @type {boolean} If true, the Downward Scaffold check (building downwards while airborne and moving quickly) is active. */
export const enableDownwardScaffoldCheck = false;
/** @type {number} Minimum number of consecutive downward blocks placed while airborne to trigger a flag. */
export const downwardScaffoldMinBlocks = 3;
/** @type {number} Maximum time in game ticks between consecutive downward scaffold blocks. */
export const downwardScaffoldMaxTickGap = 10; // 0.5 seconds
/** @type {number} Minimum horizontal speed (blocks/sec) player must maintain while downward scaffolding to be considered suspicious. */
export const downwardScaffoldMinHorizontalSpeed = 3.0;

// AirPlace Check
/** @type {boolean} If true, the check for Placing Blocks onto Air/Liquid without proper support (where vanilla would not allow) is active. Can be complex. */
export const enableAirPlaceCheck = false;
/** @type {string[]} List of block type IDs that are considered 'solid' and typically require support to be placed against. */
export const airPlaceSolidBlocks = [
    'minecraft:cobblestone', 'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block', 'minecraft:oak_planks', 'minecraft:spruce_planks',
    'minecraft:birch_planks', 'minecraft:jungle_planks', 'minecraft:acacia_planks', 'minecraft:dark_oak_planks', 'minecraft:crimson_planks',
    'minecraft:warped_planks', 'minecraft:sand', 'minecraft:gravel', 'minecraft:obsidian', 'minecraft:netherrack', 'minecraft:end_stone',
];

// --- Fast Use/Place Checks Specifics ---
// Fast Item Use Check
/** @type {boolean} If true, the Fast Item Use check (using items like ender pearls, snowballs faster than vanilla cooldowns) is active. */
export const enableFastUseCheck = true;
/** @type {Object.<string, number>} Defines minimum cooldown in milliseconds between uses for specific items. Key is item ID, value is cooldown in MS. */
export const fastUseItemCooldowns = {
    'minecraft:ender_pearl': 1000, // 1 second
    'minecraft:snowball': 150,    // Vanilla cooldown is 0.25s (5 ticks), allow some leeway
    'minecraft:egg': 150,
    'minecraft:bow': 200,         // Cooldown between shots (quick charge)
    'minecraft:crossbow': 1250,   // Cooldown for loading/firing
    'minecraft:potion': 800,      // Drinking time
    'minecraft:splash_potion': 500, // Throwing cooldown
    'minecraft:lingering_potion': 500,
    'minecraft:chorus_fruit': 800,  // Eating time
    'minecraft:shield': 500,      // Cooldown after being disabled by axe
    'minecraft:trident': 750,     // Riptide/throw cooldown (approx)
    'minecraft:fishing_rod': 500, // Casting cooldown
};

// Fast Block Place Check
/** @type {boolean} If true, the Fast Block Place check (placing blocks faster than humanly possible) is active. Similar to Block Spam (Rate) but can be more general. */
export const enableFastPlaceCheck = false;
/** @type {number} Time window in milliseconds for fast block placement detection. */
export const fastPlaceTimeWindowMs = 1000; // 1 second
/** @type {number} Maximum number of blocks allowed to be placed within `fastPlaceTimeWindowMs`. */
export const fastPlaceMaxBlocksInWindow = 10; // Stricter than blockSpamMaxBlocksInWindow if both enabled

// --- Admin Notifications ---
/** @type {boolean} If true, admins receive AntiCheat notifications by default (can be toggled per admin using !notify). */
export const acGlobalNotificationsDefaultOn = true;
/** @type {boolean} If true, admins are notified when a banned player attempts to join. */
export const notifyAdminOnBannedPlayerAttempt = true;


// --- Death Effects (Cosmetic) ---
/** @type {boolean} If true, cosmetic effects (particles, sounds) are shown when a player dies. */
export const enableDeathEffects = false;
/** @type {string} The particle effect name to spawn when a player dies (e.g., "minecraft:totem_particle"). */
export const deathEffectParticleName = 'minecraft:totem_particle';
/** @type {string} The sound ID to play when a player dies (e.g., "mob.ghast.scream"). */
export const deathEffectSoundId = 'mob.ghast.scream';
/** @type {object} Defines the default cosmetic effect shown when a player dies (legacy, can be expanded). */
export const defaultDeathEffect = { // This is somewhat legacy if using particleName and soundId above primarily
    soundId: 'ambient.weather.lightning.impact',
    particleCommand: 'particle minecraft:large_explosion ~ ~1 ~', // Example particle command
    soundOptions: { volume: 1.0, pitch: 0.8 },
};


// --- Client Behavior Checks ---
/** @type {boolean} If true, the Invalid Render Distance check (detecting clients reporting unusually high render distances) is active. */
export const enableInvalidRenderDistanceCheck = true;
/** @type {number} Maximum allowed client-reported render distance in chunks. Server-side settings might also limit this. */
export const maxAllowedClientRenderDistance = 64; // Default max for many servers/clients

// --- Chat Behavior Checks (Interaction-based) ---
/** @type {boolean} If true, the Chat During Combat check (preventing chat for a short duration after combat) is active. */
export const enableChatDuringCombatCheck = true;
/** @type {number} Seconds after the last combat interaction (dealing or taking damage) during which a player cannot chat. */
export const chatDuringCombatCooldownSeconds = 4;
/** @type {boolean} If true, the Chat During Item Use check (preventing chat while actively using certain items like food, potions) is active. */
export const enableChatDuringItemUseCheck = true;

// --- Tick Interval Configurations for Periodic Checks ---
// These define how often certain less frequent checks are performed for each player.
// Values are in game ticks (20 ticks = 1 second).
/** @type {number} Interval in game ticks for NameSpoof check. */
export const nameSpoofCheckIntervalTicks = 100; // 5 seconds
/** @type {number} Interval in game ticks for AntiGMC check. */
export const antiGmcCheckIntervalTicks = 40; // 2 seconds
/** @type {number} Interval in game ticks for NetherRoof check. */
export const netherRoofCheckIntervalTicks = 60; // 3 seconds
/** @type {number} Interval in game ticks for AutoTool check. */
export const autoToolCheckIntervalTicks = 10; // 0.5 seconds
/** @type {number} Interval in game ticks for FlatRotationBuilding check. */
export const flatRotationCheckIntervalTicks = 10; // 0.5 seconds
/** @type {number} Interval in game ticks for InvalidRenderDistance check. */
export const invalidRenderDistanceCheckIntervalTicks = 400; // 20 seconds


// --- System & Versioning ---
/** @type {string} The current version of the AntiCheat system. Updated by build process. */
export const acVersion = 'v__VERSION_STRING__'; // Placeholder, replaced by build/deploy script

// --- Command Aliases ---
/** @type {Object.<string, string>} Defines aliases for commands. Key is alias, value is the actual command name. */
export const commandAliases = {
    v: 'version',
    w: 'watch',
    i: 'inspect',
    rf: 'resetflags',
    pf: 'purgeflags', // Added alias for purgeflags
    xn: 'xraynotify',
    mf: 'myflags',
    notifications: 'notify',
    ui: 'panel',
    cw: 'clearwarnings', // Typically an alias for resetflags or a specific part of inspect
    clrchat: 'clearchat', // Common typo alias
    playerinfo: 'uinfo',
    userinfo: 'uinfo',
    worldb: 'worldborder',
    // Add more aliases as needed
};

// --- Editable Configuration Values ---
// This object holds configurations that can be modified at runtime via commands (e.g., !acconfig).
// It should mirror the structure of the constants defined above for values intended to be editable.
// Complex objects like `automodConfig` or `checkActionProfiles` are generally not included here
// and should be managed through their own dedicated systems if runtime edits are needed.
export let editableConfigValues = {
    // General Admin & System
    adminTag,
    ownerPlayerName,
    enableDebugLogging,
    prefix,
    // Welcomer & Player Info
    enableWelcomerMessage,
    welcomeMessage,
    notifyAdminOnNewPlayerJoin,
    enableDeathCoordsMessage,
    deathCoordsMessage,
    // Combat Log
    enableCombatLogDetection,
    combatLogThresholdSeconds,
    combatLogFlagIncrement,
    combatLogMessage,
    // TPA System
    enableTpaSystem,
    tpaRequestTimeoutSeconds,
    tpaRequestCooldownSeconds,
    tpaTeleportWarmupSeconds,
    // Server Info & Links
    discordLink,
    websiteLink,
    helpLinks, // Note: Editing arrays/objects via simple command might be tricky.
    generalHelpMessages,
    // Logging
    enableDetailedJoinLeaveLogging,
    // Chat Checks
    enableSwearCheck,
    swearWordList,
    swearCheckMuteDuration,
    swearCheckActionProfileName,
    enableAntiAdvertisingCheck,
    antiAdvertisingPatterns,
    antiAdvertisingActionProfileName,
    enableAdvancedLinkDetection,
    advancedLinkRegexList,
    advertisingWhitelistPatterns,
    enableCapsCheck,
    capsCheckMinLength,
    capsCheckUpperCasePercentage,
    capsCheckActionProfileName,
    enableCharRepeatCheck,
    charRepeatMinLength,
    charRepeatThreshold,
    charRepeatActionProfileName,
    enableSymbolSpamCheck,
    symbolSpamMinLength,
    symbolSpamPercentage,
    symbolSpamActionProfileName,
    // AntiGrief
    enableTntAntiGrief,
    allowAdminTntPlacement,
    tntPlacementAction,
    enableWitherAntiGrief,
    allowAdminWitherSpawn,
    witherSpawnAction,
    enableFireAntiGrief,
    allowAdminFire,
    fireControlAction,
    enableLavaAntiGrief,
    allowAdminLava,
    lavaPlacementAction,
    enableWaterAntiGrief,
    allowAdminWater,
    waterPlacementAction,
    enableBlockSpamAntiGrief,
    blockSpamBypassInCreative,
    blockSpamTimeWindowMs,
    blockSpamMaxBlocksInWindow,
    blockSpamMonitoredBlockTypes,
    blockSpamAction,
    enableEntitySpamAntiGrief,
    entitySpamBypassInCreative,
    entitySpamTimeWindowMs,
    entitySpamMaxSpawnsInWindow,
    entitySpamMonitoredEntityTypes,
    entitySpamAction,
    enableBlockSpamDensityCheck,
    blockSpamDensityMonitoredBlockTypes,
    blockSpamDensityAction,
    blockSpamDensityCheckRadius,
    blockSpamDensityTimeWindowTicks,
    blockSpamDensityThresholdPercentage,
    // Piston Lag Check
    enablePistonLagCheck,
    pistonActivationLogThresholdPerSecond,
    pistonActivationSustainedDurationSeconds,
    pistonLagLogCooldownSeconds,
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
    worldBorderParticleSequence,
    worldBorderEnablePulsingDensity,
    worldBorderPulseDensityMin,
    worldBorderPulseDensityMax,
    worldBorderPulseSpeed,
    // X-Ray Detection
    xrayDetectionNotifyOnOreMineEnabled,
    xrayDetectionMonitoredOres,
    xrayDetectionAdminNotifyByDefault,
    // Command Settings (individual command toggles)
    commandSettings, // Editing this complex object via command needs careful parsing.
    // AutoMod
    enableAutoMod,
    // Server Rules
    serverRules, // Editing multi-line string via command needs specific handling.
    // General Check Toggles
    enableReachCheck,
    enableCpsCheck,
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
    // Movement Check Specifics
    netherRoofYLevelThreshold,
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
    noFallMitigationBlocks,
    enableNoSlowCheck,
    noSlowSpeedEffectTolerancePercent,
    noSlowMaxSpeedEating,
    noSlowMaxSpeedChargingBow,
    noSlowMaxSpeedUsingShield,
    noSlowMaxSpeedSneaking,
    enableInvalidSprintCheck,
    sprintHungerLimit,
    // Combat Check Specifics
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
    attackBlockingConsumables,
    attackBlockingBows,
    attackBlockingShields,
    itemUseStateClearTicks,
    // World Interaction Check Specifics
    enableAutoToolCheck,
    autoToolSwitchToOptimalWindowTicks,
    autoToolSwitchBackWindowTicks,
    enableInstaBreakUnbreakableCheck,
    instaBreakUnbreakableBlocks,
    enableInstaBreakSpeedCheck,
    instaBreakTimeToleranceTicks,
    nukerMaxBreaksShortInterval,
    nukerCheckIntervalMs,
    bannedItemsPlace,
    bannedItemsUse,
    // Player Behavior Check Specifics
    enableNameSpoofCheck,
    nameSpoofMaxLength,
    nameSpoofDisallowedCharsRegex,
    nameSpoofMinChangeIntervalTicks,
    enableAntiGmcCheck,
    antiGmcSwitchToGameMode,
    antiGmcAutoSwitch,
    enableInventoryModCheck,
    // Advanced Chat Check Specifics
    enableFastMessageSpamCheck,
    fastMessageSpamThresholdMs,
    fastMessageSpamActionProfileName,
    enableMaxWordsSpamCheck,
    maxWordsSpamThreshold,
    maxWordsSpamActionProfileName,
    enableNewlineCheck,
    flagOnNewline,
    cancelMessageOnNewline,
    enableMaxMessageLengthCheck,
    maxMessageLength,
    flagOnMaxMessageLength,
    cancelOnMaxMessageLength,
    enableChatContentRepeatCheck,
    chatContentRepeatMessageCount,
    chatContentRepeatTimeWindowSeconds,
    chatContentRepeatFlagPlayer,
    chatContentRepeatCancelMessage,
    chatContentRepeatActionProfileName,
    enableUnicodeAbuseCheck,
    unicodeAbuseActionProfileName,
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
    enableSimpleImpersonationCheck,
    impersonationServerMessagePatterns,
    impersonationExemptPermissionLevel,
    impersonationMinMessageLengthForPatternMatch,
    impersonationActionProfileName,
    // Scaffold/Tower/Building Check Specifics
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
    // Fast Use/Place Check Specifics
    enableFastUseCheck,
    fastUseItemCooldowns, // Complex object, careful with runtime edits
    enableFastPlaceCheck,
    fastPlaceTimeWindowMs,
    fastPlaceMaxBlocksInWindow,
    // Admin Notifications
    acGlobalNotificationsDefaultOn,
    notifyAdminOnBannedPlayerAttempt,
    // Death Effects
    enableDeathEffects,
    deathEffectParticleName,
    deathEffectSoundId,
    defaultDeathEffect, // Complex object
    // Client Behavior Checks
    enableInvalidRenderDistanceCheck,
    maxAllowedClientRenderDistance,
    // Chat Behavior Checks (Interaction-based)
    enableChatDuringCombatCheck,
    chatDuringCombatCooldownSeconds,
    enableChatDuringItemUseCheck,
    // Tick Interval Configs
    nameSpoofCheckIntervalTicks,
    antiGmcCheckIntervalTicks,
    netherRoofCheckIntervalTicks,
    autoToolCheckIntervalTicks,
    flatRotationCheckIntervalTicks,
    invalidRenderDistanceCheckIntervalTicks,
};

/**
 * Updates a configuration value at runtime.
 * Performs type checking and coercion for basic types (string, number, boolean) and simple arrays of these types.
 * @param {string} key The configuration key to update (must exist in `editableConfigValues`).
 * @param {any} newValue The new value for the configuration.
 * @returns {boolean} True if the value was updated, false otherwise (e.g., key not found, type mismatch, no change).
 */
export function updateConfigValue(key, newValue) {
    if (!Object.prototype.hasOwnProperty.call(editableConfigValues, key)) {
        console.warn(`[ConfigManager] Attempted to update non-existent config key: ${key}`);
        return false;
    }

    const oldValue = editableConfigValues[key];
    const originalType = Array.isArray(oldValue) ? 'array' : typeof oldValue;
    let coercedNewValue = newValue;

    // Type coercion logic
    if (originalType === 'number' && typeof newValue === 'string') {
        const parsedNum = Number(newValue);
        if (isNaN(parsedNum)) {
            console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected number, got unparsable string "${newValue}". Update rejected.`);
            return false;
        }
        coercedNewValue = parsedNum;
    } else if (originalType === 'boolean' && typeof newValue === 'string') {
        const lowerNewValue = newValue.toLowerCase();
        if (lowerNewValue === 'true') {
            coercedNewValue = true;
        } else if (lowerNewValue === 'false') {
            coercedNewValue = false;
        } else {
            console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected boolean, got unparsable string "${newValue}". Update rejected.`);
            return false;
        }
    } else if (originalType === 'array') {
        if (typeof newValue === 'string') { // Attempt to parse comma-separated string into array
            const stringItems = newValue.trim() === '' ? [] : newValue.split(',').map(item => item.trim());
            if (oldValue.length > 0) { // Infer element type from existing array
                const targetElementType = typeof oldValue[0];
                try {
                    coercedNewValue = stringItems.map(item => {
                        if (targetElementType === 'number') {
                            const num = Number(item);
                            if (isNaN(num)) throw new Error(`Invalid number: ${item}`);
                            return num;
                        }
                        if (targetElementType === 'boolean') {
                            if (item.toLowerCase() === 'true') return true;
                            if (item.toLowerCase() === 'false') return false;
                            throw new Error(`Invalid boolean: ${item}`);
                        }
                        return item; // Assume string if not number/boolean
                    });
                } catch (e) {
                    console.warn(`[ConfigManager] Error parsing string to array for key ${key}: ${e.message}. Update rejected.`);
                    return false;
                }
            } else { // If original array is empty, assume new elements are strings
                coercedNewValue = stringItems;
            }
        } else if (!Array.isArray(newValue)) {
            console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected array, received ${typeof newValue}. Update rejected.`);
            return false;
        }
        // Further array element type validation if needed (e.g., if original array had specific object structure)
    } else if (originalType === 'string' && typeof newValue !== 'string') {
         // Allow conversion of numbers/booleans to string for string fields
        if (typeof newValue === 'number' || typeof newValue === 'boolean') {
            coercedNewValue = String(newValue);
        } else {
            console.warn(`[ConfigManager] Type mismatch for key ${key}. Expected string, got ${typeof newValue}. Update rejected.`);
            return false;
        }
    }


    const newCoercedType = Array.isArray(coercedNewValue) ? 'array' : typeof coercedNewValue;

    // Final type check after coercion
    if (originalType !== newCoercedType) {
        // Allow string field to accept coerced number/boolean as string.
        if (!(originalType === 'string' && (typeof newValue === 'number' || typeof newValue === 'boolean'))) {
            console.warn(`[ConfigManager] Type mismatch for key ${key} after coercion. Expected ${originalType}, got ${newCoercedType}. Update rejected.`);
            return false;
        }
    }

    // Check for actual change to avoid unnecessary updates/logs
    if (JSON.stringify(oldValue) === JSON.stringify(coercedNewValue)) {
        if (editableConfigValues.enableDebugLogging) { // Access debug logging through editableConfigValues
            console.log(`[ConfigManager] No change for ${key}, value is already ${JSON.stringify(coercedNewValue)}`);
        }
        return false; // Indicate no actual update occurred
    }

    editableConfigValues[key] = coercedNewValue;
    if (editableConfigValues.enableDebugLogging) {
        const oldValStr = Array.isArray(oldValue) || typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue;
        const newValStr = Array.isArray(coercedNewValue) || typeof coercedNewValue === 'object' ? JSON.stringify(coercedNewValue) : coercedNewValue;
        console.log(`[ConfigManager] Updated ${key} from "${oldValStr}" to "${newValStr}"`);
    }
    return true;
}
