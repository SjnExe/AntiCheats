import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { getConfig } from '../../core/configManager.js';
import { updateAllPlayerRanks } from '../../core/main.js';

commandManager.register({
    name: 'admin',
    description: 'Grants a player the admin tag.',
    category: 'Administration',
    permissionLevel: 0, // Owner only
    parameters: [
        { name: 'target', type: 'player', description: 'The player to grant or revoke admin from.' },
        { name: 'action', type: 'string', description: 'The action to perform: "add" or "remove". Defaults to "add".', optional: true }
    ],
    execute: (player, args) => {
        const { target, action: actionArg } = args;
        const config = getConfig();
        const action = actionArg?.toLowerCase() || 'add';

        if (!target || target.length === 0) {
            player.sendMessage(`§cPlayer not found. They must be online.`);
            return;
        }
        const targetPlayer = target[0];

        if (action !== 'add' && action !== 'remove') {
            player.sendMessage('§cInvalid action. Use "add" or "remove".');
            return;
        }

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
            updateAllPlayerRanks();
        } catch (e) {
            player.sendMessage(`§cFailed to ${action} admin tag. Error: ${e.message}`);
            console.error(`[/x:admin] Failed to ${action} tag: ${e.stack}`);
        }
    }
});
