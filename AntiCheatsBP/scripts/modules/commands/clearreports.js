import { commandManager } from './commandManager.js';
import { clearAllReports } from '../../core/reportManager.js';

commandManager.register({
    name: 'clearreports',
    description: 'Clears all active reports.',
    category: 'Administration',
    permissionLevel: 0, // Owner only
    execute: (player, args) => {
        clearAllReports();
        player.sendMessage('§aAll reports have been cleared.');
    }
});
