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
    'sethome.js',
    'home.js',
    'delhome.js',
    'homes.js',
    'spawn.js',

    // Economy System
    'balance.js',
    'baltop.js',
    'pay.js',
    'payconfirm.js',
    'bounty.js',
    'listbounty.js',
    'rbounty.js',
    'kit.js',

    // TPA System
    'tpa.js',
    'tpahere.js',
    'tpaccept.js',
    'tpadeny.js',
    'tpacancel.js',
    'tpastatus.js',

    // Moderation
    'kick.js',
    'ban.js', // This file contains 'unban'
    'offlineban.js',
    'mute.js', // This file contains 'unmute'
    'freeze.js',
    'vanish.js',
    'clear.js',
    'ecwipe.js',
    'ecwipe2.js',
    'ecwipe3.js',
    'invsee.js',
    'copyinv.js',
    'clearchat.js',
    'report.js',
    'reports.js',
    'clearreports.js',

    // Administration
    'admin.js',
    'chattoconsole.js',
    'reload.js',
    'restart.js',
    'save.js',
    'debug.js',
    'rank.js',
    'setspawn.js',
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
