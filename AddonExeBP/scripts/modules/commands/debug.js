import { commandManager } from './commandManager.js';
import { getConfig, updateConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'debug',
    description: 'Toggles the debug logging mode.',
    category: '§dServer Management',
    permissionLevel: 0, // Owner only
    execute: (player, args) => {
        const config = getConfig();
        const ownerNames = (config.ownerPlayerNames || []).map(name => name.toLowerCase());
        if (!ownerNames.includes(player.name.toLowerCase())) {
            player.sendMessage('§cYou do not have permission to use this command.');
            return;
        }

        if (args.length !== 1 || (args[0] !== 'true' && args[0] !== 'false')) {
            player.sendMessage('§cInvalid syntax. Use: !debug [true|false]');
            return;
        }

        const newDebugState = (args[0] === 'true');
        updateConfig('debug', newDebugState);

        player.sendMessage(`§aDebug mode has been set to: ${newDebugState}`);
    }
});
