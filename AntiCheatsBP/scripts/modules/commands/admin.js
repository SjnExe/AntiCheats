import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'admin',
    description: 'Grants a player the admin tag.',
    category: 'Admin',
    permissionLevel: 0, // Owner only
    execute: (player, args) => {
        const config = getConfig();
        const targetName = args[0];

        if (!targetName) {
            player.sendMessage('§cUsage: !admin <playerName>');
            return;
        }

        const targetPlayer = world.getAllPlayers().find(p => p.name === targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer not found: '${targetName}'. They must be online.`);
            return;
        }

        try {
            targetPlayer.addTag(config.adminTag);
            player.sendMessage(`§aSuccessfully added the admin tag to ${targetPlayer.name}.`);
            targetPlayer.sendMessage('§aYou have been promoted to Admin.');
        } catch (e) {
            player.sendMessage(`§cFailed to add admin tag. Error: ${e.message}`);
            console.error(`[AdminCommand] Failed to add tag: ${e.stack}`);
        }
    },
});
