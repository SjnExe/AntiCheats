import { commandManager } from './commandManager.js';
import { getConfig, updateConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'debug',
    description: 'Toggles the debug logging mode.',
    category: 'Administration',
    permissionLevel: 1, // Admin and above
    allowConsole: true,
    parameters: [
        { name: 'state', type: 'boolean', description: 'Set to true to enable, false to disable. Toggles if omitted.', optional: true }
    ],
    execute: (player, args) => {
        const currentDebugState = getConfig().debug;
        const newDebugState = args.state ?? !currentDebugState;

        updateConfig('debug', newDebugState);

        player.sendMessage(`§aDebug mode has been ${newDebugState ? '§aenabled' : '§cdisabled'}§a.`);
    }
});
