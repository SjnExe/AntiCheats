import { commandManager } from './commandManager.js';
import { startRestart } from '../../core/restartManager.js';

commandManager.register({
    name: 'restart',
    description: 'Initiates the server restart sequence.',
    category: 'Administration',
    permissionLevel: 1, // Admin only
    parameters: [],
    execute: (player, args) => {
        startRestart(player);
    }
});
