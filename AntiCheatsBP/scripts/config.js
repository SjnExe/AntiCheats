/**
 * @file Anti-Cheat Configuration File
 * This file contains all configurable settings for the AntiCheat system.
 * It defines constants for various features, checks, and system behaviors.
 * It also includes a mechanism for runtime updates to certain configuration values.
 */

/**
 * @description Defines all default configuration values that are potentially runtime-editable.
 * JSDoc comments for each setting are placed here.
 * Other modules import `editableConfigValues` for the current runtime state,
 * or this `defaultConfigSettings` for the initial hardcoded defaults.
 */
const defaultConfigSettings = {
    /** @type {string} The tag for identifying admin players. */
    adminTag: 'admin',
    /** @type {string} The exact name of the server owner. Required for owner-level commands/features. Case-sensitive. */
    ownerPlayerName: 'PlayerNameHere',
    /** @type {boolean} If true, enables detailed debug logging to the console for development and troubleshooting. */
    enableDebugLogging: true,
    /** @type {string} The prefix for chat-based commands (e.g., "!", "."). */
    prefix: '!',
    /** @type {string} The tag applied to players who are vanished. */
    vanishedPlayerTag: 'vanished',
    /** @type {string} The tag applied to players who are frozen. */
    frozenPlayerTag: 'frozen',

    // --- Welcomer & Player Info ---
    /** @type {boolean} If true, a welcome message is sent to players when they join. */
    enableWelcomerMessage: true,
    /** @type {string} The welcome message. Placeholders: {playerName} */
    welcomeMessage: 'Welcome, {playerName}, to our amazing server! We are glad to have you.',
    /** @type {boolean} If true, admins are notified when a new player joins for the first time. */
    notifyAdminOnNewPlayerJoin: true,
    /** @type {boolean} If true, players are sent their death coordinates upon respawning. */
    enableDeathCoordsMessage: true,
    /** @type {string} The death coordinates message. Placeholders: {x}, {y}, {z}, {dimensionId} */
    deathCoordsMessage: '§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.',

    // --- Combat Log ---
    /** @type {boolean} If true, enables detection of players leaving shortly after combat. */
    enableCombatLogDetection: false,
    /** @type {number} Seconds after last combat interaction within which leaving is considered combat logging. */
    combatLogThresholdSeconds: 15,
    /** @type {number} Number of flags to add for a combat log violation. */
    combatLogFlagIncrement: 1,
    /** @type {string} The admin notification message on combat log detection. Placeholders: {playerName}, {timeSinceCombat}, {incrementAmount} */
    combatLogMessage: '§c[CombatLog] §e{playerName}§c disconnected {timeSinceCombat}s after being in combat! Flags: +{incrementAmount}',

    // --- TPA System ---
    /** @type {boolean} If true, the TPA (Teleport Ask) system is enabled. */
    enableTpaSystem: false,
    /** @type {number} Seconds a TPA request remains valid before automatically expiring. */
    tpaRequestTimeoutSeconds: 60,
    /** @type {number} Seconds a player must wait between sending TPA requests. */
    tpaRequestCooldownSeconds: 10,
    /** @type {number} Seconds of warmup before a player is teleported after a TPA request is accepted. Movement or damage cancels it. */
    tpaTeleportWarmupSeconds: 10,
    /** @type {boolean} If true, TPA is cancelled if the teleporting player moves during the warmup period. */
    tpaCancelOnMoveDuringWarmup: true,
    /** @type {number} Maximum distance (in blocks) a player can move during TPA warmup before it's cancelled. */
    tpaMovementTolerance: 0.5,

    // --- Server Info & Links ---
    /** @type {string} Link to the server's Discord. Displayed in help or server info commands. */
    discordLink: 'https://discord.gg/example',
    /** @type {string} Link to the server's website. */
    websiteLink: 'https://example.com',
    /** @type {Array<{title: string, url: string}>} Array of objects defining helpful links (e.g., for rules, reporting). */
    helpLinks: [
        { title: 'Our Discord Server', url: 'https://discord.gg/YourInviteCode' },
        { title: 'Website/Forums', url: 'https://yourwebsite.com/forums' },
        { title: 'Report a Player', url: 'https://yourwebsite.com/report' },
    ],
    /** @type {string[]} Array of general help messages/tips. */
    generalHelpMessages: [
        'Welcome to the server! Type !help for commands.',
        'Use !help for a list of commands.',
        'Report issues or players using !report.',
        'Type !rules to see the server rules.',
    ],

    // --- Logging ---
    /** @type {boolean} If true, enables detailed logging of player join and leave events to the console. */
    enableDetailedJoinLeaveLogging: true,

    // --- Chat Checks ---
    /** @type {boolean} If true, enables the Swear Word detection check. */
    enableSwearCheck: false,
    /** @type {string[]} List of swear words to detect (case-insensitive, whole word). */
    swearWordList: [],
    /** @type {string} Duration for the mute applied on swear word detection (e.g., "30s", "5m", "1h"). Parsed by `playerUtils.parseDuration`. */
    swearCheckMuteDuration: '30s',
    /** @type {string} The action profile name from `actionProfiles.js` for swear word violations. */
    swearCheckActionProfileName: 'chatSwearViolation',
    /** @type {boolean} If true, enables the basic anti-advertising check in chat. */
    enableAntiAdvertisingCheck: false,
    /** @type {string[]} List of string patterns to detect potential advertisements. These are simple substring matches. */
    antiAdvertisingPatterns: [
        'http://', 'https://', 'www.', '.com', '.net', '.org', '.gg', '.tk', '.co', '.uk', '.biz', '.info', '.io',
        '.me', '.tv', '.us', '.ws', '.club', '.store', '.online', '.site', '.xyz', '.shop',
        'discord.gg/', 'joinmc.', 'playmc.', 'server.',
    ],
    /** @type {string} The action profile name from `actionProfiles.js` for advertising violations. */
    antiAdvertisingActionProfileName: 'chatAdvertisingDetected',
    /** @type {boolean} If true, enables advanced regex-based link detection and whitelisting. More comprehensive but potentially more resource-intensive. */
    enableAdvancedLinkDetection: false,
    /** @type {string[]} List of regex strings for advanced link detection. Ensure these are valid JavaScript regex patterns. */
    advancedLinkRegexList: [
        'https?://(?:[a-zA-Z0-9\\-_]+\\.)+[a-zA-Z]{2,}(?::\\d+)?(?:/[^\\s]*)?',
        'www\\.(?:[a-zA-Z0-9\\-_]+\\.)+[a-zA-Z]{2,}(?::\\d+)?(?:/[^\\s]*)?',
        '\\b(?:[a-zA-Z0-9\\-_]+\\.)+(com|net|org|gg|io|me|tv|us|uk|biz|info|club|store|online|site|xyz|shop|network|info|website|co|dev|app|online|xyz|tech|space|store|fun|press|host|art|blog|cafe|pics|live|life|news|ninja|cool|guru|gallery|city|country|link|click|buzz|stream|tube|chat|community|forum|group|page|fans|media|show|studio|style|video|software|pictures|graphics|game|games|server|play|mc|srv|network|gaming|fun|pro|services|shop|store|center|solutions|support|tech|tools|systems|cloud|digital|data|security|hosting|design|dev|app|api)(\\b|/[^\\s]*)',
        '\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}(?::\\d+)?(?:/[^\\s]*)?\\b',
    ],
    /** @type {string[]} List of patterns (strings or regex strings) to whitelist from advertising flags. If using regex, ensure they are valid. */
    advertisingWhitelistPatterns: [],
    /** @type {boolean} If true, enables the check for excessive capitalization (CAPS abuse) in chat. */
    enableCapsCheck: false,
    /** @type {number} The minimum message length for the CAPS abuse check to apply. */
    capsCheckMinLength: 10,
    /** @type {number} The percentage (0-100) of uppercase letters to trigger a CAPS abuse flag. */
    capsCheckUpperCasePercentage: 70,
    /** @type {string} The action profile name from `actionProfiles.js` for CAPS abuse violations. */
    capsCheckActionProfileName: 'chatCapsAbuseDetected',
    /** @type {boolean} If true, enables the check for excessive character repetition in chat (e.g., "helloooooo"). */
    enableCharRepeatCheck: false,
    /** @type {number} The minimum message length for the character repeat check to apply. */
    charRepeatMinLength: 10,
    /** @type {number} The minimum number of identical consecutive characters to trigger a flag. */
    charRepeatThreshold: 6,
    /** @type {string} The action profile name from `actionProfiles.js` for character repeat violations. */
    charRepeatActionProfileName: 'chatCharRepeatDetected',
    /** @type {boolean} If true, enables the check for excessive symbol usage in chat. */
    enableSymbolSpamCheck: false,
    /** @type {number} The minimum message length for the symbol spam check to apply. */
    symbolSpamMinLength: 10,
    /** @type {number} The percentage (0-100) of non-alphanumeric characters to trigger a symbol spam flag. */
    symbolSpamPercentage: 50,
    /** @type {string} The action profile name from `actionProfiles.js` for symbol spam violations. */
    symbolSpamActionProfileName: 'chatSymbolSpamDetected',

    // --- AntiGrief ---
    /** @type {boolean} If true, enables anti-grief measures for TNT placement. */
    enableTntAntiGrief: false,
    /** @type {boolean} If true, admins (identified by `adminTag`) can place TNT without restriction. */
    allowAdminTntPlacement: true,
    /** @type {string} Action to take when unauthorized TNT placement is detected ("remove", "warn", "flag_only"). */
    tntPlacementAction: 'remove',
    /** @type {boolean} If true, enables anti-grief measures for Wither spawning. */
    enableWitherAntiGrief: false,
    /** @type {boolean} If true, admins can spawn Withers without restriction. */
    allowAdminWitherSpawn: true,
    /** @type {string} Action for unauthorized Wither spawn ("prevent", "kill", "warn", "flag_only"). */
    witherSpawnAction: 'prevent',
    /** @type {boolean} If true, enables anti-grief measures for fire spread/placement. */
    enableFireAntiGrief: false,
    /** @type {boolean} If true, admins can create fire without restriction. */
    allowAdminFire: true,
    /** @type {string} Action for unauthorized fire ("extinguish", "warn", "flag_only"). */
    fireControlAction: 'extinguish',
    /** @type {boolean} If true, enables anti-grief measures for lava placement. */
    enableLavaAntiGrief: false,
    /** @type {boolean} If true, admins can place lava without restriction. */
    allowAdminLava: true,
    /** @type {string} Action for unauthorized lava placement ("remove", "warn", "flag_only"). */
    lavaPlacementAction: 'remove',
    /** @type {boolean} If true, enables anti-grief measures for water placement. */
    enableWaterAntiGrief: false,
    /** @type {boolean} If true, admins can place water without restriction. */
    allowAdminWater: true,
    /** @type {string} Action for unauthorized water placement ("remove", "warn", "flag_only"). */
    waterPlacementAction: 'remove',
    /** @type {boolean} If true, enables detection of rapid block placement (block spam by rate). */
    enableBlockSpamAntiGrief: false,
    /** @type {boolean} If true, players in Creative mode bypass the block spam (rate) check. */
    blockSpamBypassInCreative: true,
    /** @type {number} Time window in milliseconds to count blocks for rate-based spam detection. */
    blockSpamTimeWindowMs: 1000,
    /** @type {number} Maximum number of blocks allowed to be placed within `blockSpamTimeWindowMs`. */
    blockSpamMaxBlocksInWindow: 8,
    /** @type {string[]} Specific block types to monitor for rate-based spam. Empty array means all blocks. */
    blockSpamMonitoredBlockTypes: ['minecraft:dirt', 'minecraft:cobblestone', 'minecraft:netherrack', 'minecraft:sand', 'minecraft:gravel'],
    /** @type {string} Action for block spam (rate) violation ("warn", "flag_only", "kick"). */
    blockSpamAction: 'warn',
    /** @type {boolean} If true, enables detection of rapid entity spawning (e.g., boats, armor stands). */
    enableEntitySpamAntiGrief: false,
    /** @type {boolean} If true, players in Creative mode bypass the entity spam check. */
    entitySpamBypassInCreative: true,
    /** @type {number} Time window in milliseconds to count entities for spam detection. */
    entitySpamTimeWindowMs: 2000,
    /** @type {number} Maximum number of specified entities allowed to be spawned within `entitySpamTimeWindowMs`. */
    entitySpamMaxSpawnsInWindow: 5,
    /** @type {string[]} Specific entity types to monitor for spam. */
    entitySpamMonitoredEntityTypes: ['minecraft:boat', 'minecraft:armor_stand', 'minecraft:item_frame', 'minecraft:minecart', 'minecraft:snow_golem', 'minecraft:iron_golem'],
    /** @type {string} Action for entity spam violation ("kill", "warn", "flag_only"). "kill" attempts to remove the spawned entities. */
    entitySpamAction: 'kill',
    /** @type {boolean} If true, enables detection of high-density block placement within a small area. */
    enableBlockSpamDensityCheck: false,
    /** @type {string[]} Specific block types to monitor for density-based spam. Empty array means all blocks. */
    blockSpamDensityMonitoredBlockTypes: ['minecraft:dirt', 'minecraft:cobblestone', 'minecraft:netherrack', 'minecraft:sand', 'minecraft:gravel'],
    /** @type {string} Action for block spam (density) violation ("warn", "flag_only"). */
    blockSpamDensityAction: 'warn',
    /** @type {number} Radius for the density check cube (e.g., 1 means a 3x3x3 cube centered on the new block). */
    blockSpamDensityCheckRadius: 1,
    /** @type {number} Time window in game ticks to consider recent blocks for density calculation. (e.g., 60 ticks = 3 seconds). */
    blockSpamDensityTimeWindowTicks: 60,
    /** @type {number} Percentage (0-100) of volume filled by player's recent blocks within the check radius to trigger detection. */
    blockSpamDensityThresholdPercentage: 70,

    // --- Piston Lag Check ---
    /** @type {boolean} If true, enables monitoring of rapid piston activations to detect potential lag machines. */
    enablePistonLagCheck: false,
    /** @type {number} Activations per second of a single piston to trigger logging/alert. */
    pistonActivationLogThresholdPerSecond: 15,
    /** @type {number} Duration in seconds piston activity must be sustained above threshold to trigger. */
    pistonActivationSustainedDurationSeconds: 3,
    /** @type {number} Cooldown in seconds before logging/alerting for the same piston again to prevent log spam. */
    pistonLagLogCooldownSeconds: 60,
    /** @type {number} Max size of the piston activity tracking map to prevent memory issues. */
    pistonActivityMapMaxSize: 2000,
    /** @type {number} Seconds after which an inactive piston entry is removed from tracking map. */
    pistonActivityEntryTimeoutSeconds: 300,


    // --- World Border System ---
    /** @type {boolean} Master switch for the entire World Border feature. */
    enableWorldBorderSystem: false,
    /** @type {string[]} Dimensions where world border settings are actively managed and checked. */
    worldBorderKnownDimensions: ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'],
    /** @type {string} Warning message shown to players approaching the border. */
    worldBorderWarningMessage: '§cYou are approaching the world border!',
    /** @type {boolean} Default setting for whether players take damage when outside the world border. */
    worldBorderDefaultEnableDamage: false,
    /** @type {number} Default damage amount per interval for players outside the border (0.5 heart = 1 damage). */
    worldBorderDefaultDamageAmount: 0.5,
    /** @type {number} Default interval in game ticks at which damage is applied (20 ticks = 1 second). */
    worldBorderDefaultDamageIntervalTicks: 20,
    /** @type {number} Number of damage events after which a player is teleported back inside. Set to 0 or negative to disable teleport. */
    worldBorderTeleportAfterNumDamageEvents: 30,
    /** @type {boolean} If true, enables visual particle effects for the world border. Can be performance intensive. */
    worldBorderEnableVisuals: false,
    /** @type {string} Default particle type ID for the world border visual effect (e.g., "minecraft:end_rod", "minecraft:basic_crit_particle"). */
    worldBorderParticleName: 'minecraft:end_rod',
    /** @type {number} Visual range in blocks from the border where particles may appear. */
    worldBorderVisualRange: 24,
    /** @type {number} Density of particles for the visual effect. Higher is denser. Affects performance. */
    worldBorderParticleDensity: 1,
    /** @type {number} Height in blocks of the particle wall visual. */
    worldBorderParticleWallHeight: 4,
    /** @type {number} Length in blocks of each segment of the particle wall. Larger segments might perform better but look less continuous. */
    worldBorderParticleSegmentLength: 32,
    /** @type {number} Interval in game ticks at which world border visuals are updated. Higher interval = less frequent updates, better performance. */
    worldBorderVisualUpdateIntervalTicks: 10,
    /** @type {string[]} If populated, visuals cycle through these particles. Overrides `worldBorderParticleName`. Example: ["minecraft:totem_particle", "minecraft:end_rod"] */
    worldBorderParticleSequence: [],
    /** @type {boolean} If true, enables pulsing density effect for border visuals. Adds to visual flair but also performance cost. */
    worldBorderEnablePulsingDensity: false,
    /** @type {number} Minimum particle density multiplier for pulsing effect (0.0 to 1.0). */
    worldBorderPulseDensityMin: 0.5,
    /** @type {number} Maximum particle density multiplier for pulsing effect (>= `worldBorderPulseDensityMin`). */
    worldBorderPulseDensityMax: 1.5,
    /** @type {number} Speed of the pulsing effect. Higher is faster. */
    worldBorderPulseSpeed: 1.0,

    // --- X-Ray Detection Notifications ---
    /** @type {boolean} If true, admins are notified when players mine valuable ores. This is a notification system, not a preventative measure. */
    xrayDetectionNotifyOnOreMineEnabled: true,
    /** @type {string[]} List of block type IDs monitored for X-Ray mining notifications. */
    xrayDetectionMonitoredOres: ['minecraft:diamond_ore', 'minecraft:deepslate_diamond_ore', 'minecraft:ancient_debris'],
    /** @type {boolean} If true, admins receive X-Ray notifications by default (can be toggled per admin using !xraynotify). */
    xrayDetectionAdminNotifyByDefault: true,

    // --- Sound Event Configuration ---
    /**
     * @description Configuration for sound events triggered by the AntiCheat system.
     * Each key represents a specific event.
     * `enabled`: (boolean) Whether this sound event is active.
     * `soundId`: (string) The Minecraft sound ID (e.g., "random.orb", "note.pling"). Empty or null means no sound.
     * `volume`: (number, optional) Sound volume, typically 0.0 to 1.0. Defaults to 1.0.
     * `pitch`: (number, optional) Sound pitch. Defaults to 1.0.
     * `target`: (string, optional) Who hears the sound:
     *           - "player": The player directly involved in or causing the event.
     *           - "admin": All online administrators who have notifications enabled.
     *           - "targetPlayer": A specific target player of an action (e.g., for TPA).
     *           - "global": All online players (use with extreme caution).
     * `description`: (string) A human-readable description of when this sound plays.
     */
    soundEvents: {
        tpaRequestReceived: {
            enabled: true,
            soundId: 'random.orb',
            volume: 1.0,
            pitch: 1.2,
            target: 'targetPlayer',
            description: 'Sound played for a player when they receive a TPA request (tpa or tpahere).',
        },
        adminNotificationReceived: { // Played for admins when playerUtils.notifyAdmins is called
            enabled: true,
            soundId: 'note.pling',
            volume: 0.8,
            pitch: 1.5,
            target: 'admin',
            description: 'Sound played for an admin when they receive any AntiCheat system notification via notifyAdmins.',
        },
        playerWarningReceived: { // Played for player when playerUtils.warnPlayer is called
            enabled: true,
            soundId: 'note.bass',
            volume: 1.0,
            pitch: 0.8,
            target: 'player',
            description: 'Sound played for a player when they receive a direct warning message from AntiCheat (e.g., from a check or AutoMod).',
        },
        uiFormOpen: {
            enabled: false,
            soundId: 'ui.button.click',
            volume: 0.7,
            pitch: 1.0,
            target: 'player',
            description: 'Sound played when a UI form (e.g., admin panel, report form) is opened for a player.',
        },
        commandSuccess: {
            enabled: false,
            soundId: 'random.successful_hit',
            volume: 0.8,
            pitch: 1.0,
            target: 'player',
            description: 'Sound played for a player when they execute a command successfully.',
        },
        commandError: {
            enabled: false,
            soundId: 'mob.villager.no',
            volume: 1.0,
            pitch: 0.9,
            target: 'player',
            description: 'Sound played for a player when a command they executed results in an error.',
        },
        automodActionTaken: { // Played for the player being actioned by automod (kick/mute/ban)
            enabled: true,
            soundId: 'mob.irongolem.hit',
            volume: 1.0,
            pitch: 0.9,
            target: 'player',
            description: 'Sound played for a player when AutoMod takes a significant action against them (e.g., mute, kick, ban).',
        },
    },

    // --- Command Specific Toggles & Values ---
    /** @type {Object.<string, {enabled: boolean}>} Allows toggling individual commands on or off. */
    commandSettings: {
        version: { enabled: true },
        myflags: { enabled: true },
        testnotify: { enabled: true },
        kick: { enabled: true },
        clearchat: { enabled: true },
        inspect: { enabled: true },
        warnings: { enabled: true },
        resetflags: { enabled: true },
        rules: { enabled: true },
        vanish: { enabled: false },
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
        netherlock: { enabled: false },
        endlock: { enabled: false },
        worldborder: { enabled: true },
        addrank: { enabled: true },
        removerank: { enabled: true },
        listranks: { enabled: true },
        listwatched: { enabled: true },
        purgeflags: { enabled: true },
        report: { enabled: true },
        viewreports: { enabled: true },
        clearreports: { enabled: true },
        watch: { enabled: true },
        unwatch: { enabled: true },
    },
    /** @type {number} Number of empty lines sent by !clearchat command to clear chat. */
    chatClearLinesCount: 150,
    /** @type {number} Number of reports displayed per page in the !viewreports command. */
    reportsViewPerPage: 5,


    // --- Automated Moderation System ---
    /** @type {boolean} If true, the Automated Moderation system (AutoMod) is active. This system uses `automodConfig.js` and `actionProfiles.js`. */
    enableAutoMod: false,
    /** @type {string} Default duration for mutes applied manually by admins if no duration is specified. */
    manualMuteDefaultDuration: '1h',

    // --- Server Rules ---
    /** @type {string} A single string containing all server rules, separated by newlines. Displayed by the `!rules` command. */
    serverRules: `Rule 1: Be respectful to all players and staff.
Rule 2: No cheating, exploiting, or using unauthorized modifications.
Rule 3: Do not spam chat or use excessive caps/symbols.
Rule 4: Follow instructions from server administrators and moderators.
Rule 5: Keep chat appropriate and avoid offensive language.
Rule 6: Have fun and contribute to a positive community!`,

    // --- General Check Toggles (Master Switches for Check Categories) ---
    /** @type {boolean} Master toggle for Reach checks. */
    enableReachCheck: false,
    /** @type {boolean} Master toggle for CPS (Clicks Per Second) checks. */
    enableCpsCheck: false,
    /** @type {boolean} Master toggle for View Snap / Invalid Pitch checks (Aimbot/Killaura components). */
    enableViewSnapCheck: false,
    /** @type {boolean} Master toggle for Multi-Target Killaura checks. */
    enableMultiTargetCheck: false,
    /** @type {boolean} Master toggle for State Conflict checks (e.g., attacking while eating). */
    enableStateConflictCheck: false,
    /** @type {boolean} Master toggle for Fly checks (hover, sustained, high Y-velocity). */
    enableFlyCheck: false,
    /** @type {boolean} Master toggle for Speed checks (ground, air - though air speed is often part of fly). */
    enableSpeedCheck: false,
    /** @type {boolean} Master toggle for NoFall checks. */
    enableNofallCheck: false,
    /** @type {boolean} Master toggle for Nuker checks. */
    enableNukerCheck: false,
    /** @type {boolean} Master toggle for Illegal Item (use/place) checks. */
    enableIllegalItemCheck: false,
    /** @type {boolean} Master toggle for Self-Hurt checks. */
    enableSelfHurtCheck: false,
    /** @type {boolean} Master toggle for Nether Roof access checks. */
    enableNetherRoofCheck: false,

    // --- Movement Checks Specifics ---
    /** @type {number} Percentage (0.0 to 1.0) of general tolerance for NoSlow check if not Speed affected. */
    noSlowGeneralTolerancePercent: 0.05,
    /** @type {number} The Y-level at or above which a player in the Nether is considered to be on the roof. */
    netherRoofYLevelThreshold: 128,
    /** @type {number} Minimum fall distance in blocks that is expected to cause fall damage. Used by NoFall check. Vanilla is >3 blocks. */
    minFallDistanceForDamage: 3.5,
    /** @type {number} Bonus Y-velocity per level of Jump Boost effect (e.g. 0.2 means +20% Y velocity bonus per level). */
    jumpBoostYVelocityBonus: 0.2,
    /** @type {number} Grace ticks after damage/elytra use before Y-velocity checks apply strictly. */
    yVelocityGraceTicks: 10,
    /** @type {number} Threshold for vertical speed (blocks per tick, positive is upward) for sustained fly detection. (0.5 BPT = 10 BPS) */
    flySustainedVerticalSpeedThreshold: 0.5,
    /** @type {number} Number of consecutive off-ground ticks, while exceeding `flySustainedVerticalSpeedThreshold`, to trigger a fly flag. */
    flySustainedOffGroundTicksThreshold: 10,
    /** @type {number} Minimum height in blocks above the last known ground position for hover detection. */
    flyHoverNearGroundThreshold: 3,
    /** @type {number} Vertical speed (absolute value, blocks per tick) below which a player is considered hovering. (0.08 BPT = 1.6 BPS) */
    flyHoverVerticalSpeedThreshold: 0.08,
    /** @type {number} Number of consecutive off-ground ticks, while meeting hover conditions, to trigger a hover flag. */
    flyHoverOffGroundTicksThreshold: 20,
    /** @type {number} Maximum fall distance accumulated while hovering that will not be reset, to differentiate from actual falls. */
    flyHoverMaxFallDistanceThreshold: 1.0,
    /** @type {number} A tolerance buffer in blocks per second added to the maximum horizontal speed calculation to reduce false positives. */
    speedToleranceBuffer: 0.5,
    /** @type {number} Number of consecutive ticks a player must exceed maximum horizontal speed on ground to be flagged by Speed check. */
    speedGroundConsecutiveTicksThreshold: 5,
    /** @type {string[]} List of block type IDs that mitigate fall damage (e.g., "minecraft:hay_block", "minecraft:water"). Water is handled by checking `isInWater` or `isTouchingWater`. */
    noFallMitigationBlocks: ['minecraft:hay_block', 'minecraft:powder_snow', 'minecraft:sweet_berry_bush', 'minecraft:cobweb'],
    /** @type {boolean} If true, the NoSlow check (detecting movement speed reduction bypass while using items/sneaking) is active. */
    enableNoSlowCheck: false,
    /** @type {number} Percentage (0.0 to 1.0) of additional speed allowed if player has Speed effect, relative to the action's max speed. E.g., 0.10 for 10% buffer. */
    noSlowSpeedEffectTolerancePercent: 0.10,
    /** @type {number} Maximum horizontal speed (blocks/sec) allowed while eating or drinking. Vanilla movement is significantly slowed. */
    noSlowMaxSpeedEating: 1.0,
    /** @type {number} Maximum horizontal speed (blocks/sec) allowed while charging a bow. Vanilla movement is significantly slowed. */
    noSlowMaxSpeedChargingBow: 1.0,
    /** @type {number} Maximum horizontal speed (blocks/sec) allowed while actively using/raising a shield. Vanilla walking speed is ~4.3 BPS; shield does not slow normal walking/sprinting. This value helps catch hacks if combined with other speed modifiers. */
    noSlowMaxSpeedUsingShield: 4.4,
    /** @type {number} Maximum horizontal speed (blocks/sec) allowed while sneaking. Vanilla sneaking speed is ~1.31 BPS. */
    noSlowMaxSpeedSneaking: 1.5,
    /** @type {boolean} If true, the Invalid Sprint check (detecting sprinting under disallowed conditions like hunger, blindness, using item) is active. */
    enableInvalidSprintCheck: false,
    /** @type {number} Minimum food level (inclusive) required to sprint. Vanilla default is > 6 (i.e., 7 or more). */
    sprintHungerLimit: 6,

    // --- Combat Checks Specifics ---
    /** @type {number} Maximum clicks per second (CPS) threshold before flagging. Humanly achievable sustainable CPS is typically below 15-20. */
    maxCpsThreshold: 20,
    /** @type {number} Maximum reach distance in blocks for Survival/Adventure mode players. Vanilla is ~3 for melee, ~4.5 for block interaction. */
    reachDistanceSurvival: 4.5,
    /** @type {number} Maximum reach distance in blocks for Creative mode players. Vanilla is ~5 for melee, ~6 for block interaction. */
    reachDistanceCreative: 6.0,
    /** @type {number} A small buffer in blocks added to maximum reach distance calculations to reduce false positives from latency/minor inaccuracies. */
    reachBuffer: 0.5,
    /** @type {number} Time window in milliseconds over which CPS is calculated. */
    cpsCalculationWindowMs: 1000,
    /** @type {number} Maximum degrees the player's pitch (up/down view angle) can change in a single game tick immediately after an attack. Very high values can indicate aim assistance. */
    maxPitchSnapPerTick: 75,
    /** @type {number} Maximum degrees the player's yaw (left/right view angle) can change in a single game tick immediately after an attack. */
    maxYawSnapPerTick: 100,
    /** @type {number} Number of game ticks after an attack during which view snaps (pitch/yaw changes) are monitored. */
    viewSnapWindowTicks: 10,
    /** @type {number} Minimum pitch value (degrees) considered invalid (e.g., looking impossibly far down). Vanilla range is -90 to 90. */
    invalidPitchThresholdMin: -90.5,
    /** @type {number} Maximum pitch value (degrees) considered invalid (e.g., looking impossibly far up). Vanilla range is -90 to 90. */
    invalidPitchThresholdMax: 90.5,
    /** @type {number} Time window in milliseconds for detecting attacks on multiple distinct targets. */
    multiTargetWindowMs: 1000,
    /** @type {number} Number of distinct entities that must be hit within the `multiTargetWindowMs` to trigger a multi-target flag. */
    multiTargetThreshold: 3,
    /** @type {number} Maximum number of recent hit target records to store per player for multi-target analysis. */
    multiTargetMaxHistory: 10,
    /** @type {number} Number of ticks an 'item use' state (e.g., `isUsingConsumable`) persists before auto-clearing if no explicit stop event. (20 ticks = 1 second). */
    itemUseStateClearTicks: 60,

    // --- World Interaction Checks Specifics ---
    /** @type {boolean} If true, the AutoTool check (detecting instant switching to the optimal tool before breaking a block) is active. */
    enableAutoToolCheck: false,
    /** @type {number} Maximum ticks between starting to break a block and switching to an optimal tool to be considered suspicious by AutoTool check. Low values (e.g., 1-2) are stricter. */
    autoToolSwitchToOptimalWindowTicks: 2,
    /** @type {number} Maximum ticks after breaking a block (with a switched optimal tool) to detect a switch back to a previous non-optimal tool, for AutoTool check. */
    autoToolSwitchBackWindowTicks: 5,
    /** @type {number} Ticks after which a break attempt state for AutoTool is considered stale and reset. */
    autoToolBreakAttemptTimeoutTicks: 200,
    /** @type {boolean} If true, the check for breaking normally unbreakable blocks (like bedrock by non-ops) is active. */
    enableInstaBreakUnbreakableCheck: false,
    /** @type {string[]} List of block type IDs considered normally unbreakable by non-Operator players in Survival/Adventure. */
    instaBreakUnbreakableBlocks: [
        'minecraft:bedrock', 'minecraft:barrier', 'minecraft:command_block', 'minecraft:repeating_command_block',
        'minecraft:chain_command_block', 'minecraft:structure_block', 'minecraft:structure_void', 'minecraft:jigsaw',
        'minecraft:light_block', 'minecraft:end_portal_frame', 'minecraft:end_gateway',
    ],
    /** @type {boolean} If true, the check for breaking blocks significantly faster than vanilla capabilities (considering tool, enchantments, effects) is active. */
    enableInstaBreakSpeedCheck: false,
    /** @type {number} Tolerance in game ticks for block breaking speed. Actual break time must be less than (ExpectedTime - Tolerance) to flag. Higher values are more lenient. */
    instaBreakTimeToleranceTicks: 2,
    /** @type {number} Maximum number of blocks that can be broken within `nukerCheckIntervalMs` before flagging for Nuker. */
    nukerMaxBreaksShortInterval: 4,
    /** @type {number} Time window in milliseconds for the Nuker check to count broken blocks. */
    nukerCheckIntervalMs: 200,
    /** @type {string[]} Array of item type IDs banned from being placed by players. */
    bannedItemsPlace: ['minecraft:command_block', 'minecraft:moving_block', 'minecraft:structure_void', 'minecraft:barrier'],
    /** @type {string[]} Array of item type IDs banned from being used by players (e.g., right-click action). */
    bannedItemsUse: [],

    // --- Player Behavior Checks Specifics ---
    /** @type {boolean} If true, the NameSpoof check (detecting invalid characters, excessive length, or rapid name changes) is active. */
    enableNameSpoofCheck: false,
    /** @type {number} Maximum allowed length for a player's nameTag. Used by NameSpoof check. Vanilla limits are usually shorter. */
    nameSpoofMaxLength: 48,
    /** @type {string} Regular expression pattern for disallowed characters in player nameTags (e.g., newlines, control characters). */
    nameSpoofDisallowedCharsRegex: '[\\n\\r\\t\\x00-\\x1F\\x7F-\\x9F]',
    /** @type {number} Minimum interval in game ticks between allowed player nameTag changes. Used by NameSpoof check. (200 ticks = 10 seconds) */
    nameSpoofMinChangeIntervalTicks: 200,
    /** @type {boolean} If true, the Anti-GMC check (detecting unauthorized Creative mode) is active. */
    enableAntiGmcCheck: false,
    /** @type {string} The gamemode (e.g., "survival", "adventure") to switch players to if unauthorized Creative mode is detected and `antiGmcAutoSwitch` is true. */
    antiGmcSwitchToGameMode: 'survival',
    /** @type {boolean} If true, automatically switch a player's gamemode if unauthorized Creative mode is detected. */
    antiGmcAutoSwitch: true,
    /** @type {boolean} If true, Inventory Modification checks (e.g., for illegal items, unobtainable enchantments) are active. This is a complex area. */
    enableInventoryModCheck: false,

    // --- Advanced Chat Checks Specifics ---
    /** @type {boolean} If true, the Fast Message Spam check (sending messages too quickly) is active. */
    enableFastMessageSpamCheck: false,
    /** @type {number} Minimum time in milliseconds that must pass between messages to avoid being considered spam. */
    fastMessageSpamThresholdMs: 500,
    /** @type {string} Action profile name for fast message spam. */
    fastMessageSpamActionProfileName: 'chatSpamFastMessage',
    /** @type {boolean} If true, the Max Words Spam check (messages with too many words) is active. */
    enableMaxWordsSpamCheck: false,
    /** @type {number} Maximum allowed number of words in a single chat message. */
    maxWordsSpamThreshold: 50,
    /** @type {string} Action profile name for max words spam. */
    maxWordsSpamActionProfileName: 'chatSpamMaxWords',
    /** @type {boolean} If true, checks for newline characters (\n, \r) in chat messages. */
    enableNewlineCheck: false,
    /** @type {boolean} If true, flags player for using newlines if `enableNewlineCheck` is true. */
    flagOnNewline: true,
    /** @type {boolean} If true, cancels messages with newlines if `enableNewlineCheck` is true. */
    cancelMessageOnNewline: true,
    /** @type {boolean} If true, checks if chat messages exceed `maxMessageLength`. */
    enableMaxMessageLengthCheck: false,
    /** @type {number} Maximum allowed character length for a single chat message. Vanilla limit is 256. */
    maxMessageLength: 256,
    /** @type {boolean} If true, flags player for overly long messages if `enableMaxMessageLengthCheck` is true. */
    flagOnMaxMessageLength: true,
    /** @type {boolean} If true, cancels overly long messages if `enableMaxMessageLengthCheck` is true. */
    cancelOnMaxMessageLength: true,
    /** @type {boolean} If true, checks for players sending the same or very similar messages repeatedly. */
    enableChatContentRepeatCheck: false,
    /** @type {boolean} If true, flags the player for content repeat spam. */
    chatContentRepeatFlagPlayer: false,
    /** @type {boolean} If true, cancels the message that triggers content repeat spam. */
    chatContentRepeatCancelMessage: false,
    /** @type {string} Action profile name for chat content repeat violations. */
    chatContentRepeatActionProfileName: 'chatSpamContentRepeat',
    /** @type {boolean} If true, the Unicode Abuse (Zalgo text, excessive diacritics) check is active. */
    enableUnicodeAbuseCheck: false,
    /** @type {string} Action profile name for Unicode abuse violations. */
    unicodeAbuseActionProfileName: 'chatUnicodeAbuse',
    /** @type {boolean} If true, the Gibberish Chat check (messages that appear to be random characters) is active. */
    enableGibberishCheck: false,
    /** @type {number} Minimum message length to apply gibberish check. */
    gibberishMinMessageLength: 10,
    /** @type {number} Minimum ratio of alphabetic characters (0.0-1.0) for gibberish check to apply (filters out symbol-only spam if covered by another check). */
    gibberishMinAlphaRatio: 0.6,
    /** @type {number} Lower bound for vowel ratio (0.0-1.0) to flag as gibberish (too few vowels). */
    gibberishVowelRatioLowerBound: 0.15,
    /** @type {number} Upper bound for vowel ratio (0.0-1.0) to flag as gibberish (too many vowels). */
    gibberishVowelRatioUpperBound: 0.80,
    /** @type {number} Maximum number of consecutive consonants to flag as gibberish. */
    gibberishMaxConsecutiveConsonants: 5,
    /** @type {string} Action profile name for gibberish violations. */
    gibberishActionProfileName: 'chatGibberish',
    /** @type {boolean} If true, the Excessive Mentions chat check (spamming @player tags) is active. */
    enableExcessiveMentionsCheck: false,
    /** @type {number} Minimum message length to apply excessive mentions check. */
    mentionsMinMessageLength: 10,
    /** @type {number} Maximum number of unique users that can be mentioned in a single message. */
    mentionsMaxUniquePerMessage: 4,
    /** @type {number} Maximum number of times a single user can be mentioned in a single message. */
    mentionsMaxRepeatedPerMessage: 3,
    /** @type {string} Action profile name for excessive mention violations. */
    mentionsActionProfileName: 'chatExcessiveMentions',
    /** @type {boolean} If true, the Simple Impersonation check (trying to look like server/staff messages) is active. */
    enableSimpleImpersonationCheck: false,
    /** @type {string[]} Regex patterns to identify server/staff message impersonation attempts. Use with caution to avoid false positives. */
    impersonationServerMessagePatterns: [
        '^\\[(Server|Admin|System|Mod|Staff|Broadcast|Announcement|Alert)\\]',
        '^§[4c][\\s\\S]*?(Warning|Critical|Error)',
        '^§[b9ea][\\s\\S]*?(Notice|Info|Server|System)',
    ],
    /** @type {number} Permission level (from rankManager) at or below which players are exempt from impersonation checks. E.g., 0 for normal players, higher for staff. */
    impersonationExemptPermissionLevel: 1,
    /** @type {number} Minimum message length for impersonation pattern matching to apply. */
    impersonationMinMessageLengthForPatternMatch: 10,
    /** @type {string} Action profile name for impersonation attempts. */
    impersonationActionProfileName: 'chatImpersonationAttempt',

    // --- Scaffold/Tower/Building Checks Specifics ---
    /** @type {boolean} If true, the Scaffold/Tower check (detecting players rapidly building straight up) is active. */
    enableTowerCheck: false,
    /** @type {number} Maximum time in game ticks between consecutive upward pillar blocks. Low values are stricter. */
    towerMaxTickGap: 10,
    /** @type {number} Minimum number of consecutive upward blocks placed to trigger a tower flag. */
    towerMinHeight: 5,
    /** @type {number} Maximum pitch deviation (degrees, usually negative for looking down) allowed while pillaring up. Very specific pitch can indicate automation. */
    towerMaxPitchWhilePillaring: -30,
    /** @type {number} How many recent block placements to store for pattern analysis related to building checks. */
    towerPlacementHistoryLength: 20,
    /** @type {boolean} If true, the Flat/Invalid Rotation While Building check (detecting building with unnatural, static view angles) is active. */
    enableFlatRotationCheck: false,
    /** @type {number} Number of consecutive block placements to analyze for static or flat rotation patterns. */
    flatRotationConsecutiveBlocks: 4,
    /** @type {number} Maximum degrees of variance allowed for pitch over `flatRotationConsecutiveBlocks` to be considered 'static'. */
    flatRotationMaxPitchVariance: 2.0,
    /** @type {number} Maximum degrees of variance allowed for yaw over `flatRotationConsecutiveBlocks` to be considered 'static'. */
    flatRotationMaxYawVariance: 2.0,
    /** @type {number} Minimum pitch for 'flat horizontal' building detection (e.g., bridging straight out). */
    flatRotationPitchHorizontalMin: -5.0,
    /** @type {number} Maximum pitch for 'flat horizontal' building detection. */
    flatRotationPitchHorizontalMax: 5.0,
    /** @type {number} Minimum pitch for 'flat downward' building detection (e.g., scaffolding straight down with minimal view change). */
    flatRotationPitchDownwardMin: -90.0,
    /** @type {number} Maximum pitch for 'flat downward' building detection. */
    flatRotationPitchDownwardMax: -85.0,
    /** @type {boolean} If true, the Downward Scaffold check (building downwards while airborne and moving quickly) is active. */
    enableDownwardScaffoldCheck: false,
    /** @type {number} Minimum number of consecutive downward blocks placed while airborne to trigger a flag. */
    downwardScaffoldMinBlocks: 3,
    /** @type {number} Maximum time in game ticks between consecutive downward scaffold blocks. */
    downwardScaffoldMaxTickGap: 10,
    /** @type {number} Minimum horizontal speed (blocks/sec) player must maintain while downward scaffolding to be considered suspicious. */
    downwardScaffoldMinHorizontalSpeed: 3.0,
    /** @type {boolean} If true, the check for Placing Blocks onto Air/Liquid without proper support (where vanilla would not allow) is active. Can be complex. */
    enableAirPlaceCheck: false,
    /** @type {string[]} List of block type IDs that are considered 'solid' and typically require support to be placed against. */
    airPlaceSolidBlocks: [
        'minecraft:cobblestone', 'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block', 'minecraft:oak_planks', 'minecraft:spruce_planks',
        'minecraft:birch_planks', 'minecraft:jungle_planks', 'minecraft:acacia_planks', 'minecraft:dark_oak_planks', 'minecraft:crimson_planks',
        'minecraft:warped_planks', 'minecraft:sand', 'minecraft:gravel', 'minecraft:obsidian', 'minecraft:netherrack', 'minecraft:end_stone',
    ],

    // --- Fast Use/Place Checks Specifics ---
    /** @type {boolean} If true, the Fast Item Use check (using items like ender pearls, snowballs faster than vanilla cooldowns) is active. */
    enableFastUseCheck: false,
    /** @type {Object.<string, number>} Defines minimum cooldown in milliseconds between uses for specific items. Key is item ID, value is cooldown in MS. */
    fastUseItemCooldowns: {
        'minecraft:ender_pearl': 1000,
        'minecraft:snowball': 150,
        'minecraft:egg': 150,
        'minecraft:bow': 200,
        'minecraft:crossbow': 1250,
        'minecraft:potion': 800,
        'minecraft:splash_potion': 500,
        'minecraft:lingering_potion': 500,
        'minecraft:chorus_fruit': 800,
        'minecraft:shield': 500,
        'minecraft:trident': 750,
        'minecraft:fishing_rod': 500,
    },
    /** @type {boolean} If true, the Fast Block Place check (placing blocks faster than humanly possible) is active. Similar to Block Spam (Rate) but can be more general. */
    enableFastPlaceCheck: false,
    /** @type {number} Time window in milliseconds for fast block placement detection. */
    fastPlaceTimeWindowMs: 1000,
    /** @type {number} Maximum number of blocks allowed to be placed within `fastPlaceTimeWindowMs`. */
    fastPlaceMaxBlocksInWindow: 10,

    // --- Admin Notifications & System Event Notifications ---
    /** @type {boolean} If true, admins receive general AntiCheat notifications by default (can be toggled per admin using !notify). */
    acGlobalNotificationsDefaultOn: true,
    /** @type {boolean} If true, admins are notified when a banned player attempts to join. */
    notifyAdminOnBannedPlayerAttempt: true,
    /** @type {boolean} If true, admins are notified when various admin utility commands are used (e.g., rank changes, dimension locks). */
    notifyOnAdminUtilCommandUsage: true,
    /** @type {boolean} If true, admins are notified when an admin uses the !copyinv command. */
    notifyOnCopyInventory: true,
    /** @type {boolean} If true, admins are notified when a player is flagged by a check. */
    notifyOnPlayerFlagged: true,
    /** @type {boolean} If true, admins are notified when AutoMod takes an action against a player. */
    notifyOnAutoModAction: true,
    /** @type {boolean} If true, admins are notified when a new player report is submitted. */
    notifyOnNewPlayerReport: true,
    /** @type {boolean} If true, admins are notified when a player attempts to enter a locked dimension. */
    notifyOnDimensionLockAttempt: true,

    // --- Moderation Defaults ---
    /** @type {string} Default duration for mutes applied by AutoMod. */
    automodDefaultMuteDuration: '10m',
    /** @type {string} Default duration for mutes applied manually by admins if no duration is specified. */
    manualMuteDefaultDuration: '1h',

    // --- Death Effects (Cosmetic) ---
    /** @type {boolean} If true, cosmetic effects (particles, sounds) are shown when a player dies. */
    enableDeathEffects: false,
    /** @type {string} The particle effect name to spawn when a player dies (e.g., "minecraft:totem_particle"). */
    deathEffectParticleName: 'minecraft:totem_particle',
    /** @type {string} The sound ID to play when a player dies (e.g., "mob.ghast.scream"). */
    deathEffectSoundId: 'mob.ghast.scream',
    /** @type {object} Defines the default cosmetic effect shown when a player dies (legacy, can be expanded). */
    defaultDeathEffect: {
        soundId: 'ambient.weather.lightning.impact',
        particleCommand: 'particle minecraft:large_explosion ~ ~1 ~',
        soundOptions: { volume: 1.0, pitch: 0.8 },
    },

    // --- Client Behavior Checks ---
    /** @type {boolean} If true, the Invalid Render Distance check (detecting clients reporting unusually high render distances) is active. */
    enableInvalidRenderDistanceCheck: false,
    /** @type {number} Maximum allowed client-reported render distance in chunks. Server-side settings might also limit this. */
    maxAllowedClientRenderDistance: 64,

    // --- Chat Behavior Checks (Interaction-based) ---
    /** @type {boolean} If true, the Chat During Combat check (preventing chat for a short duration after combat) is active. */
    enableChatDuringCombatCheck: false,
    /** @type {number} Seconds after the last combat interaction (dealing or taking damage) during which a player cannot chat. */
    chatDuringCombatCooldownSeconds: 4,
    /** @type {boolean} If true, the Chat During Item Use check (preventing chat while actively using certain items like food, potions) is active. */
    enableChatDuringItemUseCheck: false,

    // --- Tick Interval Configurations for Periodic Checks ---
    /** @type {number} Interval in game ticks for NameSpoof check. */
    nameSpoofCheckIntervalTicks: 100,
    /** @type {number} Interval in game ticks for AntiGMC check. */
    antiGmcCheckIntervalTicks: 40,
    /** @type {number} Interval in game ticks for NetherRoof check. */
    netherRoofCheckIntervalTicks: 60,
    /** @type {number} Interval in game ticks for AutoTool check. */
    autoToolCheckIntervalTicks: 10,
    /** @type {number} Interval in game ticks for FlatRotationBuilding check. */
    flatRotationCheckIntervalTicks: 10,
    /** @type {number} Interval in game ticks for InvalidRenderDistance check. */
    invalidRenderDistanceCheckIntervalTicks: 400,

    // --- Command Specific Configs (Values) ---
    /** @type {number} Number of empty lines sent by !clearchat command to clear chat. */
    chatClearLinesCount: 150,
    /** @type {number} Number of reports displayed per page in the !viewreports command. */
    reportsViewPerPage: 5,
};

// --- System & Versioning (Not part of editableConfigValues by default) ---
/** @type {string} The current version of the AntiCheat system. Updated by build process. */
export const acVersion = 'v__VERSION_STRING__';

// --- Command Aliases (Not part of editableConfigValues by default) ---
// Command aliases are now defined directly in each command's definition object
// within its respective file in AntiCheatsBP/scripts/commands/.
// This ensures that alias definitions are co-located with their command logic.

// --- Editable Configuration Values ---
// This object holds configurations that can be modified at runtime via commands (e.g., !acconfig).
// It is initialized by spreading the defaultConfigSettings.
// Complex objects like `automodConfig` or `checkActionProfiles` are imported and managed by their own modules
// and are not part of this editableConfigValues structure directly.
export const editableConfigValues = { ...defaultConfigSettings };

/**
 * Updates a configuration value at runtime.
 * Performs type checking and coercion for basic types (string, number, boolean) and simple arrays of these types.
 * @param {string} key - The configuration key to update (must exist in `defaultConfigSettings` and `editableConfigValues`).
 * @param {any} value - The new value for the configuration key.
 * @returns {{success: boolean, message: string, oldValue?: any, newValue?: any}} Object indicating success, a message, and optionally old/new values.
 */
export function updateConfigValue(key, value) {
    if (!Object.prototype.hasOwnProperty.call(defaultConfigSettings, key)) {
        return { success: false, message: `Configuration key "${key}" does not exist in default settings.` };
    }
    if (!Object.prototype.hasOwnProperty.call(editableConfigValues, key)) {
        return { success: false, message: `Configuration key "${key}" does not exist in editable runtime settings.` };
    }

    const oldValue = editableConfigValues[key];
    const expectedType = typeof defaultConfigSettings[key];
    let coercedValue = value;

    if (expectedType === 'boolean') {
        if (typeof value === 'string') {
            if (value.toLowerCase() === 'true') {
                coercedValue = true;
            }
            else if (value.toLowerCase() === 'false') {
                coercedValue = false;
            }
            else {
                return { success: false, message: `Invalid boolean string for key "${key}": "${value}". Use "true" or "false".`, oldValue };
            }
        }
        else if (typeof value !== 'boolean') {
            return { success: false, message: `Invalid type for boolean key "${key}". Expected boolean, got ${typeof value}.`, oldValue };
        }
    }
    else if (expectedType === 'number') {
        coercedValue = Number(value);
        if (isNaN(coercedValue)) {
            return { success: false, message: `Invalid number for key "${key}": "${value}".`, oldValue };
        }
    }
    else if (expectedType === 'string') {
        if (typeof value !== 'string') {
            coercedValue = String(value);
        }
    }
    else if (Array.isArray(defaultConfigSettings[key])) {
        if (!Array.isArray(value)) {
            if (typeof value === 'string') {
                try {
                    coercedValue = JSON.parse(value);
                    if (!Array.isArray(coercedValue)) {
                        return { success: false, message: `Key "${key}" expects an array. Parsed string was not an array.`, oldValue };
                    }
                }
                catch (e) {
                    return { success: false, message: `Key "${key}" expects an array. Could not parse string value: "${value}". Error: ${e.message}`, oldValue };
                }
            }
            else {
                return { success: false, message: `Key "${key}" expects an array. Got type ${typeof value}.`, oldValue };
            }
        }
    }
    else if (expectedType === 'object' && defaultConfigSettings[key] !== null) {
        if (typeof value === 'string') {
            try {
                coercedValue = JSON.parse(value);
                if (typeof coercedValue !== 'object' || coercedValue === null || Array.isArray(coercedValue)) {
                    return { success: false, message: `Key "${key}" expects an object. Parsed string was not a valid object.`, oldValue };
                }
            }
            catch (e) {
                return { success: false, message: `Key "${key}" expects an object. Could not parse string value: "${value}". Error: ${e.message}`, oldValue };
            }
        }
        else if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return { success: false, message: `Key "${key}" expects an object. Got type ${typeof value}.`, oldValue };
        }
    }


    editableConfigValues[key] = coercedValue;
    return { success: true, message: `Configuration "${key}" updated.`, oldValue, newValue: coercedValue };
}
