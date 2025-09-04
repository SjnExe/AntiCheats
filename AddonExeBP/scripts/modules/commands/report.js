import { commandManager } from './commandManager.js';
import { showPanel } from '../../core/uiManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';

commandManager.register({
    name: 'report',
    description: 'Opens a UI to report a player for a specific reason.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'target', type: 'player', description: 'The player to report.' }
    ],
    execute: (player, args) => {
        const { target } = args;
        // For slash commands, target is a player object array. For chat, it's a name string.
        const targetPlayer = Array.isArray(target) ? target[0] : findPlayerByName(target);

        if (!targetPlayer) {
            player.sendMessage('§cPlayer not found.');
            return;
        }

        if (targetPlayer.id === player.id) {
            player.sendMessage('§cYou cannot report yourself.');
            return;
        }

        showPanel(player, 'reportSubmitPanel', { targetPlayer });
    }
});
