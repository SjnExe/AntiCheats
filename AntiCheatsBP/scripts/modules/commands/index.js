// This file is used to load all command modules.
// By importing this single file, all commands within the imported modules will be registered.

const commandFiles = [
    // General & Info
    'help.js', 'status.js', 'rules.js', 'version.js', 'report.js',
    // TPA
    'tpa.js', 'tpahere.js', 'tpaccept.js', 'tpadeny.js', 'tpacancel.js', 'tpastatus.js',
    // Homes
    'sethome.js', 'home.js', 'delhome.js', 'homes.js',
    // Economy
    'balance.js', 'pay.js', 'baltop.js', 'bounty.js', 'listbounty.js', 'rbounty.js',
    // Kits
    'kit.js',
    // Moderation
    'panel.js', 'kick.js', 'mute.js', 'ban.js', 'freeze.js', 'vanish.js', 'invsee.js', 'tp.js', 'clearchat.js', 'reports.js',
    // Admin
    'admin.js', 'rank.js', 'gmc.js', 'gms.js', 'gma.js', 'gmsp.js', 'clear.js', 'ecwipe.js', 'copyinv.js', 'reload.js', 'debug.js', 'setbalance.js', 'clearreports.js', 'save.js',
    // Spawning
    'setspawn.js', 'spawn.js'
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
