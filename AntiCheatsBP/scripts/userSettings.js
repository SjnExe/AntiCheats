// AntiCheatsBP/scripts/user_settings.js
/**
 * @file User-configurable settings for the AntiCheat addon.
 * This file contains basic settings that server administrators might want to adjust.
 * For more advanced configurations, see config.js and action_profiles.js.
 * @version 1.0.0
 */

export const userSettings = {
    // General Admin & System
    adminTag: "admin",
    ownerPlayerName: "PlayerNameHere", // TODO: Replace with actual owner name
    enableDebugLogging: true,
    prefix: "!",
    defaultServerLanguage: "en_US",

    // Welcomer & Player Info
    enableWelcomerMessage: true,
    welcomeMessage: "message.welcome", // Key for localization
    notifyAdminOnNewPlayerJoin: true,
    enableDeathCoordsMessage: true,
    deathCoordsMessage: "message.deathCoords", // Key for localization

    // Combat Log
    enableCombatLogDetection: false,
    combatLogThresholdSeconds: 15,
    combatLogFlagIncrement: 1,
    combatLogMessage: "message.combatLogAdminNotify", // Key for localization

    // TPA System
    enableTPASystem: false,
    TPARequestTimeoutSeconds: 60,
    TPARequestCooldownSeconds: 10,
    TPATeleportWarmupSeconds: 10,

    // Server Info & Rules
    serverRules: "config.serverRules", // Key for localization
    discordLink: "https://discord.gg/example",
    websiteLink: "https://example.com",
    helpLinks: [
        { title: "Our Discord Server", url: "https://discord.gg/YourInviteCode" },
        { title: "Website/Forums", url: "https://yourwebsite.com/forums" },
        { title: "Report a Player", url: "https://yourwebsite.com/report" }
    ],
    generalHelpMessages: [ // Array of keys for localization
        "message.generalHelp.welcome",
        "message.generalHelp.helpCommandPrompt",
        "message.generalHelp.reportPrompt",
        "message.generalHelp.rulesPrompt"
    ],

    // Logging
    enableDetailedJoinLeaveLogging: true,

    // Chat Checks
    enableSwearCheck: false,
    swearWordList: [], // Empty by default
    swearCheckMuteDuration: "30s",

    // AntiGrief - TNT
    enableTntAntiGrief: false,
    allowAdminTntPlacement: true,
    tntPlacementAction: "remove",

    // AntiGrief - Wither
    enableWitherAntiGrief: false,
    allowAdminWitherSpawn: true,
    witherSpawnAction: "prevent",

    // AntiGrief - Fire
    enableFireAntiGrief: false,
    allowAdminFire: true,
    fireControlAction: "extinguish",

    // AntiGrief - Lava
    enableLavaAntiGrief: false,
    allowAdminLava: true,
    lavaPlacementAction: "remove",

    // AntiGrief - Water
    enableWaterAntiGrief: false,
    allowAdminWater: true,
    waterPlacementAction: "remove",

    // AntiGrief - Block Spam (Rate)
    enableBlockSpamAntiGrief: false,
    blockSpamBypassInCreative: true,
    blockSpamTimeWindowMs: 1000,
    blockSpamMaxBlocksInWindow: 8,
    blockSpamMonitoredBlockTypes: ["minecraft:dirt", "minecraft:cobblestone", "minecraft:netherrack", "minecraft:sand", "minecraft:gravel"],
    blockSpamAction: "warn",

    // AntiGrief - Entity Spam
    enableEntitySpamAntiGrief: false,
    entitySpamBypassInCreative: true,
    entitySpamTimeWindowMs: 2000,
    entitySpamMaxSpawnsInWindow: 5,
    entitySpamMonitoredEntityTypes: ["minecraft:boat", "minecraft:armor_stand", "minecraft:item_frame", "minecraft:minecart", "minecraft:snow_golem", "minecraft:iron_golem"],
    entitySpamAction: "kill",

    // AntiGrief - Block Spam (Density)
    enableBlockSpamDensityCheck: false,
    blockSpamDensityMonitoredBlockTypes: ["minecraft:dirt", "minecraft:cobblestone", "minecraft:netherrack", "minecraft:sand", "minecraft:gravel"],
    blockSpamDensityAction: "warn",
    // Note: blockSpamDensityCheckRadius, blockSpamDensityTimeWindowTicks, blockSpamDensityThresholdPercentage are more advanced, kept in config.js

    // Piston Lag Check
    enablePistonLagCheck: false,
    pistonActivationLogThresholdPerSecond: 15, // User might want to tweak if sensitive
    pistonActivationSustainedDurationSeconds: 3,
    pistonLagLogCooldownSeconds: 60,

    // World Border System (User-Facing Parts)
    enableWorldBorderSystem: false,
    worldBorderWarningMessage: "message.worldBorderWarning", // Key for localization
    worldBorderDefaultEnableDamage: false,
    worldBorderDefaultDamageAmount: 0.5,
    worldBorderDefaultDamageIntervalTicks: 20,
    worldBorderTeleportAfterNumDamageEvents: 30,
    worldBorderEnableVisuals: false,
    worldBorderParticleName: "minecraft:end_rod",
    worldBorderVisualRange: 24,
    worldBorderParticleDensity: 1,
    worldBorderParticleWallHeight: 4,
    worldBorderParticleSegmentLength: 32,
    worldBorderVisualUpdateIntervalTicks: 10,
    /**
     * @type {string[]} An array of particle type ID strings (e.g., ["minecraft:end_rod", "minecraft:totem_particle"]).
     * If populated, world border visuals will cycle through these particles.
     * If empty, the single `worldBorderParticleName` will be used.
     */
    worldBorderParticleSequence: [],
    /**
     * @type {boolean} If true, enables the pulsing density effect for world border visuals.
     * Requires `worldBorderEnableVisuals` to also be true.
     */
    worldBorderEnablePulsingDensity: false,
    /**
     * @type {number} The minimum particle density for the pulsing effect.
     * Represents a multiplier on the base particle spawning logic.
     */
    worldBorderPulseDensityMin: 0.5,
    /**
     * @type {number} The maximum particle density for the pulsing effect.
     * Represents a multiplier on the base particle spawning logic.
     */
    worldBorderPulseDensityMax: 1.5,
    /**
     * @type {number} Controls the speed of the pulsing effect. Higher values are faster.
     * A value of 1.0 results in a cycle roughly every 6.28 seconds at 20 TPS.
     */
    worldBorderPulseSpeed: 1.0,

    // X-Ray Detection Notifications
    xrayDetectionNotifyOnOreMineEnabled: true,
    xrayDetectionMonitoredOres: ["minecraft:diamond_ore", "minecraft:deepslate_diamond_ore", "minecraft:ancient_debris"],
    xrayDetectionAdminNotifyByDefault: true,

    // Chat Formatting (keeping these simple, advanced ones could remain in config.js if any)
    chatFormatOwnerPrefixColor: "§c",
    chatFormatOwnerNameColor: "§c",
    chatFormatOwnerMessageColor: "§f",
    chatFormatAdminPrefixColor: "§b",
    chatFormatAdminNameColor: "§b",
    chatFormatAdminMessageColor: "§f",
    chatFormatMemberPrefixColor: "§7",
    chatFormatMemberNameColor: "§7",
    chatFormatMemberMessageColor: "§f"
};
