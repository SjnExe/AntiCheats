// This file is used to load all command modules.
// By importing this single file, all commands within the imported modules will be registered.

const commandFiles = [
    // General & Info
    'help.js', 'status.js', 'rules.js', 'version.js',
    // TPA
    'tpa.js', 'tpahere.js', 'tpaccept.js', 'tpadeny.js', 'tpacancel.js', 'tpastatus.js',
    // Homes
    'sethome.js', 'home.js', 'delhome.js', 'homes.js',
    // Economy
    'balance.js', 'pay.js', 'baltop.js', 'bounty.js',
    // Kits
    'kit.js',
    // Moderation
    'panel.js', 'panelitem.js', 'kick.js', 'mute.js', 'ban.js', 'freeze.js', 'vanish.js', 'invsee.js', 'tp.js', 'clearchat.js',
    // Admin
    'admin.js', 'rank.js', 'gmc.js', 'gms.js', 'gma.js', 'gmsp.js', 'clear.js', 'ecwipe.js', 'copyinv.js', 'reload.js', 'debug.js', 'setbalance.js',
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
