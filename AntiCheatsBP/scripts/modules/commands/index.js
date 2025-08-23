// This file is used to load all command modules.
// By importing this single file, all commands within the imported modules will be registered.

const commandFiles = [
    'help.js', 'clearchat.js', 'kick.js', 'mute.js', 'ban.js', 'vanish.js', 'reload.js',
    'gmc.js', 'gms.js', 'gma.js', 'gmsp.js', 'sethome.js', 'home.js', 'delhome.js', 'homes.js',
    'tpa.js', 'tpahere.js', 'tpaccept.js', 'tpadeny.js', 'tpacancel.js', 'balance.js', 'pay.js',
    'baltop.js', 'kit.js', 'clear.js', 'ecwipe.js',
    // Debugging files
    'test1.js',
    'test2.js',
    // Keep panel.js last for easier debugging if it fails
    'panel.js'
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
