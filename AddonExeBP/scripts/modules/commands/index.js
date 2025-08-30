// This file is used to load all command modules.
// By importing this single file, all commands within the imported modules will be registered.

const commandFiles = [
    // General
    'help.js',
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
    'mute.js', // This file contains 'unmute'
    'freeze.js',
    'vanish.js',
    'clear.js',
    'invsee.js',
    'copyinv.js',
    'clearchat.js',
    'report.js',
    'reports.js',
    'clearreports.js',

    // Administration
    'admin.js',
    'reload.js',
    'debug.js',
    'rank.js',
    'setspawn.js',
    'setbalance.js',
    'tp.js',
    'gmc.js',
    'gms.js',
    'gma.js',
    'gmsp.js',
    'xraynotify.js'
];

async function loadCommands() {
    for (const file of commandFiles) {
        try {
            await import('./' + file);
        } catch (e) {
            console.error(`[CommandLoader] Failed to load command file '${file}':`);
            console.error(e.stack);
        }
    }
}

loadCommands();
