import { commandManager } from './commandManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'version',
    aliases: ['ver'],
    description: 'Displays the current version of the addon.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        player.sendMessage(`§7AntiCheat Addon Version: §e${config.ac_version}`);
    },
});
