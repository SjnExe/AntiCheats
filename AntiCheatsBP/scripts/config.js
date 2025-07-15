/**
 * @file Defines all configurable settings for the AntiCheat system.
 * @module AntiCheatsBP/scripts/config
 */

/**
 * @typedef {object} UpdateConfigValueResult
 * @property {boolean} success Whether the update was successful.
 * @property {string} message A message describing the result.
 * @property {unknown} [oldValue] The old value of the key.
 * @property {unknown} [newValue] The new value of the key.
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

    /** @type {object} Settings related to debugging and performance profiling. */
    development: {
        /** @type {boolean} If true, enables collection and logging of performance metrics. SET TO FALSE FOR PRODUCTION. */
        enablePerformanceProfiling: false,
        /** @type {number} Interval in game ticks to log performance profile data if enabled. Default: 1200 (60 seconds). */
        logPerformanceProfileIntervalTicks: 1200,
        /** @type {number} Number of ticks to stagger checks over. Higher numbers reduce tick load but increase detection time. 1 = no stagger. */
        checkStaggerTicks: 5,
    },

    /** @type {object} Settings related to player status effects and tags. */
    playerTags: {
        /** @type {string} The tag applied to players who are vanished. */
        vanished: 'vanished',
        /** @type {string} The tag applied to players who are frozen. */
        frozen: 'frozen',
    },

    /** @type {object} Settings for player welcome messages and informational messages. */
    playerInfo: {
        /** @type {boolean} If true, a welcome message is sent to players when they join. */
        enableWelcomer: true,
        /** @type {string} The welcome message. Placeholders: {playerName} */
        welcomeMessage: 'Welcome, {playerName}, to our amazing server! We are glad to have you.',
        /** @type {boolean} If true, admins are notified when a new player joins for the first time. */
        notifyAdminOnNewPlayer: true,
        /** @type {boolean} If true, players are sent their death coordinates upon respawning. */
        enableDeathCoords: true,
        /** @type {string} The death coordinates message. Placeholders: {x}, {y}, {z}, {dimensionId} */
        deathCoordsMessage: '§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.',
    },

    /** @type {object} Settings for the combat log detection system. */
    combatLog: {
        /** @type {boolean} If true, enables detection of players leaving shortly after combat. */
        enabled: false,
        /** @type {number} Seconds after last combat interaction within which leaving is considered combat logging. */
        thresholdSeconds: 15,
    },

    /** @type {object} Settings for the TPA (Teleport Ask) system. */
    tpa: {
        /** @type {boolean} If true, the TPA system is enabled. */
        enabled: false,
        /** @type {number} Seconds a TPA request remains valid before automatically expiring. */
        requestTimeoutSeconds: 60,
        /** @type {number} Seconds a player must wait between sending TPA requests. */
        requestCooldownSeconds: 10,
        /** @type {number} Seconds of warmup before a player is teleported after a TPA request is accepted. */
        teleportWarmupSeconds: 10,
        /** @type {boolean} If true, TPA is cancelled if the teleporting player moves during the warmup period. */
        cancelOnMove: true,
        /** @type {number} Maximum distance (in blocks) a player can move during TPA warmup before it's cancelled. */
        movementTolerance: 0.5,
    },

    /** @type {object} Settings for server information and links. */
    serverInfo: {
        /** @type {string} Link to the server's Discord. */
        discordLink: 'https://discord.gg/example',
        /** @type {string} Link to the server's website. */
        websiteLink: 'https://example.com',
        /** @type {Array<{title: string, url: string}>} Array of objects defining helpful links. */
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
        /** @type {string} A single string containing all server rules, separated by newlines. */
        rules: `Rule 1: Be respectful to all players and staff.
Rule 2: No cheating, exploiting, or using unauthorized modifications.
Rule 3: Do not spam chat or use excessive caps/symbols.
Rule 4: Follow instructions from server administrators and moderators.
Rule 5: Keep chat appropriate and avoid offensive language.
Rule 6: Have fun and contribute to a positive community!`,
    },

    /** @type {object} Settings for chat-related checks. */
    chatChecks: {
        /** @type {object} Settings for the swear word check. */
        swear: {
            enabled: false,
            words: [],
            actionProfile: 'chatSwearViolation',
        },
        /** @type {object} Settings for the anti-advertising check. */
        advertising: {
            enabled: false,
            patterns: [
                'http://', 'https://', 'www.', '.com', '.net', '.org', '.gg', '.tk', '.co', '.uk', '.biz', '.info', '.io',
                '.me', '.tv', '.us', '.ws', '.club', '.store', '.online', '.site', '.xyz', '.shop',
                'discord.gg/', 'joinmc.', 'playmc.', 'server.',
            ],
            whitelist: [],
            actionProfile: 'chatAdvertisingDetected',
        },
        /** @type {object} Settings for the excessive capitalization check. */
        caps: {
            enabled: false,
            minLength: 10,
            percentage: 70,
            actionProfile: 'chatCapsAbuseDetected',
        },
        /** @type {object} Settings for the character repeat check. */
        charRepeat: {
            enabled: false,
            minLength: 10,
            threshold: 6,
            actionProfile: 'chatCharRepeatDetected',
        },
        /** @type {object} Settings for the symbol spam check. */
        symbolSpam: {
            enabled: false,
            minLength: 10,
            percentage: 50,
            actionProfile: 'chatSymbolSpamDetected',
        },
        /** @type {object} Settings for the fast message spam check. */
        fastMessage: {
            enabled: false,
            thresholdMs: 500,
            actionProfile: 'chatSpamFastMessage',
        },
    },

    /** @type {object} Settings for anti-grief measures. */
    antiGrief: {
        /** @type {object} Settings for TNT placement. */
        tnt: {
            enabled: false,
            allowAdmins: true,
            action: 'remove', // "remove", "warn", "flagOnly"
        },
        /** @type {object} Settings for Wither spawning. */
        wither: {
            enabled: false,
            allowAdmins: true,
            action: 'prevent', // "prevent", "kill", "warn", "flagOnly"
        },
        /** @type {object} Settings for fire placement/spread. */
        fire: {
            enabled: false,
            allowAdmins: true,
            action: 'extinguish', // "extinguish", "warn", "flagOnly"
        },
        /** @type {object} Settings for lava placement. */
        lava: {
            enabled: false,
            allowAdmins: true,
            action: 'remove', // "remove", "warn", "flagOnly"
        },
        /** @type {object} Settings for water placement. */
        water: {
            enabled: false,
            allowAdmins: true,
            action: 'remove', // "remove", "warn", "flagOnly"
        },
    },

    /** @type {object} Settings for the world border system. */
    worldBorder: {
        /** @type {boolean} Master switch for the entire World Border feature. */
        enabled: false,
        /** @type {string[]} Dimensions where world border settings are actively managed. */
        knownDimensions: ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'],
        /** @type {string} Warning message shown to players approaching the border. */
        warningMessage: '§cYou are approaching the world border!',
        /** @type {object} Default damage settings for when a player is outside the border. */
        damage: {
            /** @type {boolean} Default setting for whether players take damage. */
            enabled: false,
            /** @type {number} Default damage amount per interval (0.5 heart = 1 damage). */
            amount: 0.5,
            /** @type {number} Default interval in game ticks at which damage is applied. */
            intervalTicks: 20,
            /** @type {number} Number of damage events before a player is teleported back inside. <= 0 to disable. */
            teleportAfterEvents: 30,
        },
        /** @type {object} Settings for the visual particle effects for the border. */
        visuals: {
            /** @type {boolean} If true, enables visual particle effects. */
            enabled: false,
            /** @type {string} Default particle type ID for the effect. */
            particleName: 'minecraft:end_rod',
            /** @type {number} Visual range in blocks from the border where particles may appear. */
            range: 24,
            /** @type {number} Density of particles. Higher is denser. */
            density: 1,
            /** @type {number} Height in blocks of the particle wall. */
            wallHeight: 4,
        },
    },

    /** @type {object} Settings for X-Ray detection notifications. */
    xrayNotify: {
        /** @type {boolean} If true, admins are notified when players mine valuable ores. */
        enabled: true,
        /** @type {string[]} List of block type IDs monitored. */
        monitoredOres: ['minecraft:diamond_ore', 'minecraft:deepslate_diamond_ore', 'minecraft:ancient_debris'],
        /** @type {boolean} If true, admins receive notifications by default. */
        notifyAdminsByDefault: true,
    },

    /** @type {object} Configuration for sound events triggered by the AntiCheat system. */
    soundEvents: {
        tpaRequestReceived: { enabled: true, soundId: 'random.orb', volume: 1.0, pitch: 1.2, target: 'targetPlayer' },
        adminNotificationReceived: { enabled: true, soundId: 'note.pling', volume: 0.8, pitch: 1.5, target: 'admin' },
        playerWarningReceived: { enabled: true, soundId: 'note.bass', volume: 1.0, pitch: 0.8, target: 'player' },
        uiFormOpen: { enabled: false, soundId: 'ui.button.click', volume: 0.7, pitch: 1.0, target: 'player' },
        commandSuccess: { enabled: false, soundId: 'random.successful_hit', volume: 0.8, pitch: 1.0, target: 'player' },
        commandError: { enabled: false, soundId: 'mob.villager.no', volume: 1.0, pitch: 0.9, target: 'player' },
        automodActionTaken: { enabled: true, soundId: 'mob.irongolem.hit', volume: 1.0, pitch: 0.9, target: 'player' },
    },

    /** @type {object} Allows toggling individual commands on or off. */
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

    /** @type {object} Settings for the automated moderation system. */
    automod: {
        /** @type {boolean} If true, the AutoMod system is active. */
        enabled: false,
        /** @type {string} Default duration for mutes applied by AutoMod. */
        defaultMuteDuration: '10m',
    },

    /** @type {object} Master toggles for various check categories. */
    checks: {
        // Combat
        reach: { enabled: false, intervalTicks: 4 }, // Frequent, but not every tick
        cps: { enabled: false, intervalTicks: 20 }, // Measured over 1 second (20 ticks)
        viewSnap: { enabled: false, intervalTicks: 5 },
        multiTarget: { enabled: false, intervalTicks: 5 },
        selfHurt: { enabled: false, intervalTicks: 4 },
        autoTool: { enabled: false, intervalTicks: 10 },

        // Movement
        fly: { enabled: false, intervalTicks: 2 }, // High frequency needed
        speed: { enabled: false, intervalTicks: 2 }, // High frequency needed
        nofall: { enabled: false, intervalTicks: 2 },
        noSlow: { enabled: false, intervalTicks: 2 },
        invalidSprint: { enabled: false, intervalTicks: 4 },
        tower: { enabled: false, intervalTicks: 2 },
        netherRoof: { enabled: false, intervalTicks: 40 }, // Low frequency is fine

        // World
        nuker: { enabled: false, intervalTicks: 5 },
        instaBreak: { enabled: false, intervalTicks: 2 },
        fastPlace: { enabled: false, intervalTicks: 2 },
        fastUse: { enabled: false, intervalTicks: 2 },

        // Player
        illegalItem: { enabled: false, intervalTicks: 100 }, // Infrequent check is okay
        nameSpoof: { enabled: false, intervalTicks: 200 }, // Very infrequent check
        stateConflict: { enabled: false, intervalTicks: 10 },
        antiGmc: { enabled: false, intervalTicks: 40 },
        inventoryMod: { enabled: false, intervalTicks: 20 },
    },
};

// --- System & Versioning (Not part of editableConfigValues by default) ---
export const acVersion = 'v__VERSION_STRING__';

/**
 * Maps command aliases to their main command names.
 * @type {Map<string, string>}
 */
export const commandAliases = new Map([
    ['b', 'ban'],
    ['cc', 'clearchat'],
    ['i', 'inspect'],
    ['inv', 'invsee'],
    ['lr', 'listranks'],
    ['lw', 'listwatched'],
    ['m', 'mute'],
    ['p', 'panel'],
    ['pr', 'purgerank'],
    ['rr', 'removerank'],
    ['v', 'vanish'],
    ['ver', 'version'],
    ['vr', 'viewreports'],
    ['w', 'watch'],
    ['wb', 'worldborder'],
    ['xray', 'xraynotify'],
    // Add other aliases here
]);

// --- Editable Configuration Values ---
export const editableConfigValues = { ...defaultConfigSettings };

/**
 * Updates a configuration value at runtime.
 * @param {string} key The configuration key to update.
 * @param {unknown} value The new value.
 * @returns {UpdateConfigValueResult} Object indicating success and a message.
 */
export function updateConfigValue(key, value) {
    if (!Object.prototype.hasOwnProperty.call(defaultConfigSettings, key)) {
        return { success: false, message: `Configuration key "${key}" does not exist.` };
    }

    const oldValue = editableConfigValues[key];
    const expectedType = typeof defaultConfigSettings[key];
    let coercedValue = value;

    try {
        if (expectedType === 'boolean') {
            if (typeof value === 'string') {
                if (value.toLowerCase() === 'true') {
                    coercedValue = true;
                } else if (value.toLowerCase() === 'false') {
                    coercedValue = false;
                } else {
                    throw new Error('Invalid boolean string');
                }
            } else if (typeof value !== 'boolean') {
                throw new Error(`Expected boolean, got ${typeof value}`);
            }
        } else if (expectedType === 'number') {
            coercedValue = Number(value);
            if (isNaN(coercedValue)) {
                throw new Error('Invalid number');
            }
        } else if (expectedType === 'string') {
            coercedValue = String(value);
        } else if (typeof expectedType === 'object') {
            if (typeof value === 'string') {
                coercedValue = JSON.parse(value);
            }
        }
    } catch (e) {
        return { success: false, message: `Type coercion failed for key "${key}": ${e.message}`, oldValue };
    }

    editableConfigValues[key] = coercedValue;
    return { success: true, message: `Configuration "${key}" updated.`, oldValue, newValue: coercedValue };
}
