import { commandManager } from './commandManager.js';
import { updateConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'debug',
    description: 'Toggles the debug logging mode.',
    category: 'Administration',
    permissionLevel: 1, // Admin and above
    parameters: [
        { name: 'state', type: 'boolean', description: 'Set to true to enable debug mode, false to disable.' }
    ],
    execute: (player, args) => {
        const { state: newDebugState } = args;

        updateConfig('debug', newDebugState);

        player.sendMessage(`§aDebug mode has been set to: ${newDebugState}`);
    }
});
