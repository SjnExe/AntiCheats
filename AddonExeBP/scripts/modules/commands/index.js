import { errorLog } from '../../core/errorLogger.js';

// This file is used to load all command modules.
// By importing this single file, all commands within the imported modules will be registered.

const commandFiles = [
    // General
    'help.js',
    'deathcoords.js',
    'panel.js',
    'rules.js',
    'status.js',
    'version.js',

    // Home System
    'home.js',
    'spawn.js',

    // Economy System
    'balance.js',
    'pay.js',
    'bounty.js',
    'kit.js',

    // TPA System
    'tpa.js',

    // Moderation
    'kick.js',
    'ban.js', // This file contains 'unban'
    'mute.js', // This file contains 'unmute'
    'freeze.js',
    'vanish.js',
    'clear.js',
    'ecwipe.js',
    'invsee.js',
    'copyinv.js',
    'clearchat.js',
    'report.js',

    // Administration
    'admin.js',
    'chattoconsole.js',
    'reload.js',
    'restart.js',
    'save.js',
    'debug.js',
    'rank.js',
    'setbalance.js',
    'tp.js',
    'gamemode.js',
    'xraynotify.js'
];

async function loadCommands() {
    for (const file of commandFiles) {
        try {
            await import('./' + file);
        } catch (e) {
            errorLog(`[CommandLoader] Failed to load command file '${file}':`);
            errorLog(e.stack);
        }
    }
}

loadCommands();
