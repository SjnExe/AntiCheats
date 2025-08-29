// This file is used to load all command modules.
// By importing this single file, all commands within the imported modules will be registered.

const commandFiles = [
    'version.js',
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
