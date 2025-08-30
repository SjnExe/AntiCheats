export const config = {
    // --- System & Core Settings ---
    version: 'v__VERSION_STRING__',
    ownerPlayerNames: ['SjnTechMlmYT'], // Default : ['Your•Name•Here']
    adminTag: 'admin',
    commandPrefix: '!',
    serverName: '§aServerExe',
    defaultGamemode: 'survival',
    debug: true,
    exeGlobalNotificationsDefaultOn: true,

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
    reports: {
        resolvedReportLifetimeDays: 7
    },
    economy: {
        enabled: true,
        startingBalance: 50,
        baltopLimit: 10,
        minimumBounty: 10,
        paymentConfirmationThreshold: 10000, // Payments over this amount require confirmation
        paymentConfirmationTimeout: 60 // Seconds to confirm a payment
    },
    playerInfo: {
        enableWelcomer: true,
        welcomeMessage: 'Welcome, {playerName}, to our amazing server!',
        notifyAdminOnNewPlayer: true,
        enableDeathCoords: true,
        deathCoordsMessage: '§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.'
    },

    // --- Player Defaults ---
    playerDefaults: {
        rankId: 'member',
        permissionLevel: 1024,
        bounty: 0
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
        'admin': { enabled: true },
        'balance': { enabled: true },
        'baltop': { enabled: true },
        'ban': { enabled: true },
        'bounty': { enabled: true },
        'clear': { enabled: true },
        'clearchat': { enabled: true },
        'clearreports': { enabled: true },
        'copyinv': { enabled: true },
        'debug': { enabled: true },
        'delhome': { enabled: true },
        'freeze': { enabled: true },
        'gma': { enabled: true },
        'gmc': { enabled: true },
        'gms': { enabled: true },
        'gmsp': { enabled: true },
        'help': { enabled: true },
        'home': { enabled: true },
        'homes': { enabled: true },
        'invsee': { enabled: true },
        'kick': { enabled: true },
        'kit': { enabled: true },
        'listbounty': { enabled: true },
        'mute': { enabled: true },
        'panel': { enabled: true },
        'pay': { enabled: true },
        'payconfirm': { enabled: true },
        'rank': { enabled: true },
        'rbounty': { enabled: true },
        'reload': { enabled: true },
        'report': { enabled: true },
        'reports': { enabled: true },
        'rules': { enabled: true },
        'setbalance': { enabled: true },
        'sethome': { enabled: true },
        'setspawn': { enabled: true },
        'spawn': { enabled: true },
        'status': { enabled: true },
        'tp': { enabled: true },
        'tpa': { enabled: true },
        'tpacancel': { enabled: true },
        'tpaccept': { enabled: true },
        'tpadeny': { enabled: true },
        'tpahere': { enabled: true },
        'tpastatus': { enabled: true },
        'vanish': { enabled: true },
        'version': { enabled: true },
        'xraynotify': { enabled: true }
    }
};
