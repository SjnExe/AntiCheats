import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'admin',
    description: 'Grants a player the admin tag.',
    category: '§dServer Management',
    permissionLevel: 0, // Owner only
    execute: (player, args) => {
        const config = getConfig();

        if (args.length === 0) {
            player.sendMessage('§cUsage: !admin "<playerName>" [add|remove]');
            return;
        }

        // --- Argument Parsing ---
        let action = 'add'; // Default action
        let remainingArgs = [...args];

        const lastArg = remainingArgs[remainingArgs.length - 1]?.toLowerCase();
        if (lastArg === 'add' || lastArg === 'remove') {
            action = lastArg;
            remainingArgs.pop();
        }

        let targetName = remainingArgs.join(' ');
        if (targetName.startsWith('"') && targetName.endsWith('"')) {
            targetName = targetName.substring(1, targetName.length - 1);
        }

        if (!targetName) {
            player.sendMessage('§cUsage: !admin "<playerName>" [add|remove]');
            return;
        }

        // --- Player Finding ---
        const targetPlayer = world.getAllPlayers().find(p => p.name === targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer not found: '${targetName}'. They must be online.`);
            return;
        }

        // --- Action Execution ---
        try {
            if (action === 'add') {
                targetPlayer.addTag(config.adminTag);
                player.sendMessage(`§aSuccessfully added the admin tag to ${targetPlayer.name}.`);
                targetPlayer.sendMessage('§aYou have been promoted to Admin.');
            } else if (action === 'remove') {
                targetPlayer.removeTag(config.adminTag);
                player.sendMessage(`§aSuccessfully removed the admin tag from ${targetPlayer.name}.`);
                targetPlayer.sendMessage('§cYou have been demoted from Admin.');
            }
        } catch (e) {
            player.sendMessage(`§cFailed to ${action} admin tag. Error: ${e.message}`);
            console.error(`[AdminCommand] Failed to ${action} tag: ${e.stack}`);
        }
    }
});
