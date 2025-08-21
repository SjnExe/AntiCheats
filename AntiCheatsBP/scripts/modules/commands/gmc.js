import { commandManager } from './commandManager.js';

commandManager.register({
    name: 'gmc',
    aliases: ['c'],
    description: 'Sets your gamemode to Creative.',
    category: 'Admin',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        try {
            player.runCommandAsync('gamemode creative @s');
            player.sendMessage('§aYour gamemode has been set to Creative.');
        } catch (e) {
            player.sendMessage(`§cFailed to set gamemode. Error: ${e.message}`);
            console.error(`[gmc] Failed to set gamemode: ${e.stack}`);
        }
    },
});
