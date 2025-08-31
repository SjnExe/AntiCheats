import { commandManager } from './commandManager.js';
import { startRestart } from '../../core/restartManager.js';

commandManager.register({
    name: 'restart',
    description: 'Initiates a timed server restart sequence.',
    category: 'Administration',
    permissionLevel: 0, // Owner only
    execute: (player, args) => {
        startRestart(player);
    }
});
