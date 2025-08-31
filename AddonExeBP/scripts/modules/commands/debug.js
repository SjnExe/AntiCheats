import { commandManager } from './commandManager.js';
import { getConfig, updateConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'debug',
    description: 'Toggles the debug logging mode.',
    category: 'Administration',
    permissionLevel: 1, // Admin and above
    execute: (player, args) => {
        if (args.length !== 1 || (args[0] !== 'true' && args[0] !== 'false')) {
            player.sendMessage('§cInvalid syntax. Use: !debug [true|false]');
            return;
        }

        const newDebugState = (args[0] === 'true');
        updateConfig('debug', newDebugState);

        player.sendMessage(`§aDebug mode has been set to: ${newDebugState}`);
    }
});
