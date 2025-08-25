import { commandManager } from './commandManager.js';
import { savePlayerData } from '../../core/playerDataManager.js';

commandManager.register({
    name: 'save',
    description: 'Manually saves all player data.',
    category: 'Administration',
    permissionLevel: 1, // Admin and above
    execute: (player, args) => {
        savePlayerData();
        player.sendMessage('§aPlayer data saved successfully.');
    }
});
