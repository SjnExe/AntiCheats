import { commandManager } from './commandManager.js';

commandManager.register({
    name: 'gma',
    aliases: ['a'],
    description: 'Sets your gamemode to Adventure.',
    category: 'Admin',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        try {
            player.runCommandAsync('gamemode adventure @s');
            player.sendMessage('§aYour gamemode has been set to Adventure.');
        } catch (e) {
            player.sendMessage(`§cFailed to set gamemode. Error: ${e.message}`);
            console.error(`[gma] Failed to set gamemode: ${e.stack}`);
        }
    },
});
