export const config = {
    // --- System & Core Settings ---
    version: 'v__VERSION_STRING__',
    ownerPlayerNames: ['SjnTechMlmYT'],
    adminTag: 'admin',
    commandPrefix: '!',
    defaultGamemode: 'survival',
    debug: true,
    acGlobalNotificationsDefaultOn: true,

    // --- Player Tags ---
    playerTags: {
        vanished: 'vanished',
        frozen: 'frozen'
    },

    // --- Feature Toggles & Settings ---
    tpa: {
        enabled: true,
        requestTimeoutSeconds: 60,
        cooldownSeconds: 300, // 5 minutes
        teleportWarmupSeconds: 5
    },
    homes: {
        enabled: true,
        maxHomes: 5,
        cooldownSeconds: 300, // 5 minutes
        teleportWarmupSeconds: 5
    },
    kits: {
        enabled: false
    },
    economy: {
        enabled: true,
        startingBalance: 0,
        baltopLimit: 10,
        minimumBounty: 100
    },
    creativeDetection: {
        enabled: true,
        periodicCheck: {
            enabled: true,
            intervalSeconds: 300 // 5 minutes
        }
    },
    playerInfo: {
        enableWelcomer: true,
        welcomeMessage: 'Welcome, {playerName}, to our amazing server!',
        notifyAdminOnNewPlayer: true,
        enableDeathCoords: true,
        deathCoordsMessage: '§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.'
    },

    // --- Server Information ---
    serverInfo: {
        discordLink: 'https://discord.gg/example',
        websiteLink: 'https://example.com',
        rules: [
            'Rule 1: Be respectful.',
            'Rule 2: No cheating or exploiting.',
            'Rule 3: Have fun!'
        ]
    },

    // --- Miscellaneous ---
    spawnLocation: null, // Example: { x: 0, y: 100, z: 0, dimensionId: 'minecraft:overworld' }

    // --- Sound Events ---
    soundEvents: {
        tpaRequestReceived: { enabled: true, soundId: 'random.orb', volume: 1.0, pitch: 1.2 },
        adminNotificationReceived: { enabled: true, soundId: 'note.pling', volume: 0.8, pitch: 1.5 },
        playerWarningReceived: { enabled: true, soundId: 'note.bass', volume: 1.0, pitch: 0.8 },
        commandError: { enabled: false, soundId: 'mob.villager.no', volume: 1.0, pitch: 0.9 }
    },

    // --- Command Enable/Disable ---
    // This section will be populated as commands are added.
    commandSettings: {
        'gmc': { enabled: true },
        'gms': { enabled: true },
        'gma': { enabled: true },
        'gmsp': { enabled: true },
        'sethome': { enabled: true },
        'home': { enabled: true },
        'delhome': { enabled: true },
        'homes': { enabled: true },
        'tpa': { enabled: true },
        'tpahere': { enabled: true },
        'tpaccept': { enabled: true },
        'tpadeny': { enabled: true },
        'tpacancel': { enabled: true },
        'balance': { enabled: true },
        'pay': { enabled: true },
        'baltop': { enabled: true },
        'kit': { enabled: true }
    }
};
