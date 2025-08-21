import { commandManager } from './commandManager.js';

commandManager.register({
    name: 'gms',
    aliases: ['s'],
    description: 'Sets your gamemode to Survival.',
    category: 'Admin',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        try {
            player.runCommandAsync('gamemode survival @s');
            player.sendMessage('§aYour gamemode has been set to Survival.');
        } catch (e) {
            player.sendMessage(`§cFailed to set gamemode. Error: ${e.message}`);
            console.error(`[gms] Failed to set gamemode: ${e.stack}`);
        }
    },
});
