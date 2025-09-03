import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';

commandManager.register({
    name: 'clearchat',
    aliases: ['cc'],
    description: 'Clears the chat for all players.',
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    parameters: [],
    execute: (player, args) => {
        try {
            // Send 100 empty lines to effectively clear the chat history for all players.
            const emptyLines = '\n'.repeat(100);
            world.sendMessage(emptyLines);
            world.sendMessage(`§aChat has been cleared by ${player.name}.`);
        } catch (error) {
            player.sendMessage('§cFailed to clear chat.');
            console.error(`[/x:clearchat] ${error.stack}`);
        }
    }
});
