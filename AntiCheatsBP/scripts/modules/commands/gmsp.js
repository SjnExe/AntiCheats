import { commandManager } from './commandManager.js';

commandManager.register({
    name: 'gmsp',
    aliases: ['sp'],
    description: 'Sets your gamemode to Spectator.',
    category: 'Admin',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        try {
            player.runCommandAsync('gamemode spectator @s');
            player.sendMessage('§aYour gamemode has been set to Spectator.');
        } catch (e) {
            player.sendMessage(`§cFailed to set gamemode. Error: ${e.message}`);
            console.error(`[gmsp] Failed to set gamemode: ${e.stack}`);
        }
    },
});
