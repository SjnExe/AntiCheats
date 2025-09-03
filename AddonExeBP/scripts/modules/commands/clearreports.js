import { commandManager } from './commandManager.js';
import { clearAllReports } from '../../core/reportManager.js';

commandManager.register({
    name: 'clearreports',
    description: 'Clears all active reports.',
    category: 'Moderation',
    permissionLevel: 1, // Admin and above
    parameters: [],
    execute: (player, args) => {
        clearAllReports();
        player.sendMessage('§aAll reports have been cleared.');
    }
});
